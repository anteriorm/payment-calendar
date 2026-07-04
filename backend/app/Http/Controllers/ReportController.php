<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Account;
use App\Models\Payment;
use App\Models\Income;
use App\Models\Item;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function balances(Request $request)
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'account_id' => 'nullable|exists:accounts,id',
        ]);

        $start = Carbon::parse($request->date_from)->startOfDay();
        $end = Carbon::parse($request->date_to)->endOfDay();

        $accounts = $request->account_id
            ? Account::where('id', $request->account_id)->get()
            : Account::all();

        $result = [];
        $totalOpening = 0;
        $totalIncome = 0;
        $totalExpense = 0;
        $totalClosing = 0;

        foreach ($accounts as $account) {
            $opening = $account->initial_balance;

            // Движения до начала периода
            $incomeBefore = Income::where('account_id', $account->id)
                ->where('planned_date', '<', $start->toDateString())
                ->whereIn('status', ['planned', 'confirmed', 'received'])
                ->sum('amount');

            $paymentBefore = Payment::where('account_id', $account->id)
                ->where('planned_date', '<', $start->toDateString())
                ->whereIn('status', ['pending', 'approved', 'in_registry', 'paid'])
                ->sum('amount');

            $opening += $incomeBefore - $paymentBefore;

            // Движения за период
            $incomePeriod = Income::where('account_id', $account->id)
                ->whereBetween('planned_date', [$start->toDateString(), $end->toDateString()])
                ->whereIn('status', ['planned', 'confirmed', 'received'])
                ->sum('amount');

            $paymentPeriod = Payment::where('account_id', $account->id)
                ->whereBetween('planned_date', [$start->toDateString(), $end->toDateString()])
                ->whereIn('status', ['pending', 'approved', 'in_registry', 'paid'])
                ->sum('amount');

            $closing = $opening + $incomePeriod - $paymentPeriod;

            $result[] = [
                'account' => $account->name,
                'opening' => $opening,
                'income' => $incomePeriod,
                'expense' => $paymentPeriod,
                'closing' => $closing,
            ];

            $totalOpening += $opening;
            $totalIncome += $incomePeriod;
            $totalExpense += $paymentPeriod;
            $totalClosing += $closing;
        }

        if ($accounts->count() > 1) {
            $result[] = [
                'account' => 'Итого',
                'opening' => $totalOpening,
                'income' => $totalIncome,
                'expense' => $totalExpense,
                'closing' => $totalClosing,
                'is_total' => true,
            ];
        }

        return response()->json($result);
    }

    public function cashGaps(Request $request)
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'account_id' => 'nullable|exists:accounts,id',
        ]);

        $start = Carbon::parse($request->date_from)->startOfDay();
        $end = Carbon::parse($request->date_to)->endOfDay();

        $accounts = $request->account_id
            ? Account::where('id', $request->account_id)->get()
            : Account::all();

        $payments = Payment::where('planned_date', '<=', $end->toDateString())
            ->whereIn('status', ['pending', 'approved', 'in_registry', 'paid'])
            ->get();

        $incomes = Income::where('planned_date', '<=', $end->toDateString())
            ->whereIn('status', ['planned', 'confirmed', 'received'])
            ->get();

        $result = [];
        $currentDate = $start->copy();

        while ($currentDate <= $end) {
            $dateString = $currentDate->toDateString();
            $dayDeficit = 0;
            $accountNames = [];
            $topAmount = 0;
            $topPayer = '';

            foreach ($accounts as $account) {
                // Остаток на начало дня
                $balance = $account->initial_balance;

                $incomeBefore = $incomes->filter(function ($income) use ($account, $dateString) {
                    return $income->account_id == $account->id
                        && $income->planned_date->toDateString() < $dateString;
                });
                $balance += $incomeBefore->sum('amount');

                $paymentBefore = $payments->filter(function ($payment) use ($account, $dateString) {
                    return $payment->account_id == $account->id
                        && $payment->planned_date->toDateString() < $dateString;
                });
                $balance -= $paymentBefore->sum('amount');

                // Движения за день
                $dayPayments = $payments->filter(function ($payment) use ($account, $dateString) {
                    return $payment->account_id == $account->id
                        && $payment->planned_date->toDateString() === $dateString;
                });
                $dayIncomes = $incomes->filter(function ($income) use ($account, $dateString) {
                    return $income->account_id == $account->id
                        && $income->planned_date->toDateString() === $dateString;
                });

                $balance += $dayIncomes->sum('amount') - $dayPayments->sum('amount');

                if ($balance < 0) {
                    $dayDeficit += $balance;
                    $accountNames[] = $account->name;

                    // Находим крупнейший платёж дня
                    $maxPayment = $dayPayments->sortByDesc('amount')->first();
                    if ($maxPayment && $maxPayment->amount > $topAmount) {
                        $topAmount = $maxPayment->amount;
                        $cp = $maxPayment->counterparty;
                        $topPayer = $cp ? $cp->name : '—';
                    }
                }
            }

            if ($dayDeficit < 0) {
                $result[] = [
                    'date' => $dateString,
                    'account' => implode(', ', $accountNames),
                    'deficit' => $dayDeficit,
                    'top_payer' => $topPayer,
                    'top_amount' => $topAmount,
                ];
            }

            $currentDate->addDay();
        }

        return response()->json($result);
    }

    public function planFact(Request $request)
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
        ]);

        $start = Carbon::parse($request->date_from)->startOfDay();
        $end = Carbon::parse($request->date_to)->endOfDay();

        $items = Item::all();
        $result = [];

        foreach ($items as $item) {
            if ($item->type === 'payment') {
                $budget = Payment::where('item_id', $item->id)
                    ->whereBetween('planned_date', [$start->toDateString(), $end->toDateString()])
                    ->whereIn('status', ['pending', 'approved', 'in_registry'])
                    ->sum('amount');

                $fact = Payment::where('item_id', $item->id)
                    ->whereBetween('planned_date', [$start->toDateString(), $end->toDateString()])
                    ->where('status', 'paid')
                    ->sum('amount');
            } else {
                $budget = Income::where('item_id', $item->id)
                    ->whereBetween('planned_date', [$start->toDateString(), $end->toDateString()])
                    ->whereIn('status', ['planned', 'confirmed'])
                    ->sum('amount');

                $fact = Income::where('item_id', $item->id)
                    ->whereBetween('planned_date', [$start->toDateString(), $end->toDateString()])
                    ->where('status', 'received')
                    ->sum('amount');
            }

            if ($budget > 0 || $fact > 0) {
                $period = $start->format('F Y');
                $result[] = [
                    'period' => $period,
                    'item' => $item->name,
                    'budget' => $budget,
                    'fact' => $fact,
                ];
            }
        }

        return response()->json($result);
    }
}
