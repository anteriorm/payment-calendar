<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Account;
use App\Models\Payment;
use App\Models\Income;
use Carbon\Carbon;

class CalendarController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'account_id' => 'nullable|exists:accounts,id',
            'item_id' => 'nullable|exists:items,id',
            'counterparty_id' => 'nullable|exists:counterparties,id',
            'income_status' => 'nullable|in:planned,confirmed,received',
        ]);

        $start = Carbon::parse($request->start_date)->startOfDay();
        $end = Carbon::parse($request->end_date)->endOfDay();
        $accountId = $request->account_id;

        $accounts = $accountId
            ? Account::where('id', $accountId)->get()
            : Account::all();

        if ($accounts->isEmpty()) {
            return response()->json(['message' => 'No accounts found'], 404);
        }

        $endStr = $end->toDateString();

        // Обычные платежи (не recurring)
        $regularPayments = Payment::where('recurring', false)
            ->whereIn('status', ['draft', 'pending', 'approved', 'in_registry', 'paid'])
            ->where('planned_date', '<=', $endStr)
            ->with('counterparty')
            ->get();

        // Recurring-шаблоны (активные, next_date в диапазоне)
        $recurringPayments = Payment::where('recurring', true)
            ->where('template_status', 'active')
            ->whereNotNull('next_date')
            ->where('next_date', '<=', $endStr)
            ->with('counterparty')
            ->get();

        $payments = $regularPayments->merge($recurringPayments);

        $incomeStatuses = $request->filled('income_status')
            ? [$request->income_status]
            : ['planned', 'confirmed', 'received'];

        $incomeQuery = Income::where('planned_date', '<=', $endStr)
            ->whereIn('status', $incomeStatuses);

        if ($request->filled('item_id')) {
            $payments = $payments->filter(fn($p) => $p->item_id == $request->item_id);
            $incomeQuery->where('item_id', $request->item_id);
        }
        if ($request->filled('counterparty_id')) {
            $payments = $payments->filter(fn($p) => $p->counterparty_id == $request->counterparty_id);
            $incomeQuery->where('counterparty_id', $request->counterparty_id);
        }

        $incomes = $incomeQuery->with('counterparty')->get();

        $result = [];
        $dates = [];

        $currentDate = $start->copy();
        while ($currentDate <= $end) {
            $dates[] = $currentDate->toDateString();
            $currentDate->addDay();
        }

        foreach ($accounts as $account) {
            $balance = $account->initial_balance;

            $incomesBefore = $incomes->filter(function ($income) use ($account, $start) {
                return $income->account_id == $account->id
                    && $income->planned_date->toDateString() < $start->toDateString();
            });
            $balance += $incomesBefore->sum('amount');

            $paymentsBefore = $payments->filter(function ($payment) use ($account, $start) {
                return $payment->account_id == $account->id
                    && $payment->planned_date->toDateString() < $start->toDateString();
            });
            $balance -= $paymentsBefore->sum('amount');

            foreach ($dates as $dateString) {
                $dayPayments = $payments->filter(function ($payment) use ($account, $dateString) {
                    return $payment->account_id == $account->id
                        && $payment->planned_date->toDateString() === $dateString;
                });
                $dayIncomes = $incomes->filter(function ($income) use ($account, $dateString) {
                    return $income->account_id == $account->id
                        && $income->planned_date->toDateString() === $dateString;
                });

                $expenseTotal = $dayPayments->sum('amount');
                $incomeTotal = $dayIncomes->sum('amount');
                $openingBalance = $balance;
                $balance += $incomeTotal - $expenseTotal;

                // Описание дня — краткое содержание движений
                $descriptions = [];
                foreach ($dayPayments->take(3) as $p) {
                    $cpName = $p->counterparty?->name ?? '';
                    $descriptions[] = '↓ ' . ($cpName ? $cpName . ': ' : '') . ($p->purpose ?? '');
                }
                foreach ($dayIncomes->take(3) as $inc) {
                    $cpName = $inc->counterparty?->name ?? '';
                    $descriptions[] = '↑ ' . ($cpName ? $cpName . ': ' : '') . ($inc->purpose ?? '');
                }
                $description = implode('; ', $descriptions);

                $result[] = [
                    'date' => $dateString,
                    'account_id' => $account->id,
                    'account_name' => $account->name,
                    'opening_balance' => $openingBalance,
                    'income_total' => $incomeTotal,
                    'expense_total' => $expenseTotal,
                    'closing_balance' => $balance,
                    'has_cash_gap' => $balance < 0,
                    'description' => $description,
                ];
            }
        }

        // Сводная строка (итого по каждой валюте) для каждой даты
        $accountCurrencyMap = [];
        foreach ($accounts as $acc) {
            $accountCurrencyMap[$acc->id] = $acc->currency;
        }

        foreach ($dates as $dateString) {
            $dayRows = array_filter($result, fn($r) => $r['date'] === $dateString);
            if (empty($dayRows)) continue;

            // Группируем по валютам
            $byCurrency = [];
            foreach ($dayRows as $row) {
                $cur = $accountCurrencyMap[$row['account_id']] ?? 'RUB';
                if (!isset($byCurrency[$cur])) {
                    $byCurrency[$cur] = ['opening' => 0, 'income' => 0, 'expense' => 0, 'closing' => 0];
                }
                $byCurrency[$cur]['opening'] += $row['opening_balance'];
                $byCurrency[$cur]['income'] += $row['income_total'];
                $byCurrency[$cur]['expense'] += $row['expense_total'];
                $byCurrency[$cur]['closing'] += $row['closing_balance'];
            }

            foreach ($byCurrency as $cur => $totals) {
                $result[] = [
                    'date' => $dateString,
                    'account_id' => null,
                    'account_name' => "Итого ($cur)",
                    'opening_balance' => $totals['opening'],
                    'income_total' => $totals['income'],
                    'expense_total' => $totals['expense'],
                    'closing_balance' => $totals['closing'],
                    'has_cash_gap' => $totals['closing'] < 0,
                    'description' => '',
                ];
            }
        }

        return response()->json($result);
    }
}
