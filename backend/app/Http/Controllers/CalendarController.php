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
        ]);

        $start = Carbon::parse($request->start_date)->startOfDay();
        $end = Carbon::parse($request->end_date)->endOfDay();
        $accountId = $request->account_id;

        // Получаем счета (один или все)
        $accounts = $accountId
            ? Account::where('id', $accountId)->get()
            : Account::all();

        if ($accounts->isEmpty()) {
            return response()->json(['message' => 'No accounts found'], 404);
        }

        // Получаем все платежи и поступления за период + до start_date
        $payments = Payment::where('planned_date', '<=', $end)
            ->whereIn('status', ['pending', 'approved', 'in_registry', 'paid'])
            ->get();

        $incomes = Income::where('planned_date', '<=', $end)
            ->whereIn('status', ['planned', 'received'])
            ->get();

        $result = [];

        foreach ($accounts as $account) {
            // Вычисляем остаток на начало периода (начальный баланс + все движения до start_date)
            $balance = $account->initial_balance;

            // Прибавляем поступления до start_date
            $incomesBefore = $incomes->filter(function ($income) use ($account, $start) {
                return $income->account_id == $account->id && $income->planned_date < $start->toDateString();
            });
            $balance += $incomesBefore->sum('amount');

            // Вычитаем платежи до start_date
            $paymentsBefore = $payments->filter(function ($payment) use ($account, $start) {
                return $payment->account_id == $account->id && $payment->planned_date < $start->toDateString();
            });
            $balance -= $paymentsBefore->sum('amount');

            // Проходим по каждому дню периода
            $currentDate = $start->copy();
            while ($currentDate <= $end) {
                $dateString = $currentDate->toDateString();

                // Суммы за день
                $dayPayments = $payments->filter(function ($payment) use ($account, $dateString) {
                    return $payment->account_id == $account->id && $payment->planned_date == $dateString;
                });
                $dayIncomes = $incomes->filter(function ($income) use ($account, $dateString) {
                    return $income->account_id == $account->id && $income->planned_date == $dateString;
                });

                $paymentsTotal = $dayPayments->sum('amount');
                $incomesTotal = $dayIncomes->sum('amount');

                // Обновляем остаток
                $balance += $incomesTotal - $paymentsTotal;

                // Записываем результат дня
                $result[] = [
                    'date' => $dateString,
                    'account_id' => $account->id,
                    'account_name' => $account->name,
                    'opening_balance' => $balance + $paymentsTotal - $incomesTotal, // остаток на начало дня
                    'incomes' => $incomesTotal,
                    'payments' => $paymentsTotal,
                    'closing_balance' => $balance,
                    'has_cash_gap' => $balance < 0,
                ];

                $currentDate->addDay();
            }
        }

        return response()->json([
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'data' => $result,
        ]);
    }
}
