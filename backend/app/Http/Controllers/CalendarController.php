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

        $paymentQuery = Payment::where('planned_date', '<=', $end->toDateString())
            ->whereIn('status', ['pending', 'approved', 'in_registry', 'paid']);
        $incomeQuery = Income::where('planned_date', '<=', $end->toDateString())
            ->whereIn('status', ['planned', 'confirmed', 'received']);

        if ($request->filled('item_id')) {
            $paymentQuery->where('item_id', $request->item_id);
            $incomeQuery->where('item_id', $request->item_id);
        }
        if ($request->filled('counterparty_id')) {
            $paymentQuery->where('counterparty_id', $request->counterparty_id);
            $incomeQuery->where('counterparty_id', $request->counterparty_id);
        }

        $payments = $paymentQuery->get();
        $incomes = $incomeQuery->get();

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

                $result[] = [
                    'date' => $dateString,
                    'account_id' => $account->id,
                    'account_name' => $account->name,
                    'opening_balance' => $openingBalance,
                    'income_total' => $incomeTotal,
                    'expense_total' => $expenseTotal,
                    'closing_balance' => $balance,
                    'has_cash_gap' => $balance < 0,
                ];
            }
        }

        // Сводная строка (итого по всем счетам) для каждой даты
        foreach ($dates as $dateString) {
            $dayRows = array_filter($result, fn($r) => $r['date'] === $dateString);
            if (empty($dayRows)) continue;

            $openingTotal = array_sum(array_column($dayRows, 'opening_balance'));
            $incomeTotal = array_sum(array_column($dayRows, 'income_total'));
            $expenseTotal = array_sum(array_column($dayRows, 'expense_total'));
            $closingTotal = array_sum(array_column($dayRows, 'closing_balance'));

            $result[] = [
                'date' => $dateString,
                'account_id' => null,
                'account_name' => 'Итого',
                'opening_balance' => $openingTotal,
                'income_total' => $incomeTotal,
                'expense_total' => $expenseTotal,
                'closing_balance' => $closingTotal,
                'has_cash_gap' => $closingTotal < 0,
            ];
        }

        return response()->json($result);
    }
}
