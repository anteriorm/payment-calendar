<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Payment;
use App\Models\Income;
use App\Models\AuditLog;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today()->toDateString();
        $endGapDate = Carbon::today()->addDays(30)->toDateString();

        // Загружаем всё одним запросом каждую таблицу
        $accounts = Account::all();

        $incomes = Income::whereIn('status', ['planned', 'confirmed', 'received'])
            ->where('planned_date', '<=', $endGapDate)
            ->get(['account_id', 'planned_date', 'amount']);

        $payments = Payment::whereIn('status', ['pending', 'approved', 'in_registry', 'paid'])
            ->where('planned_date', '<=', $endGapDate)
            ->get(['account_id', 'planned_date', 'amount']);

        // Группируем движения по account_id для быстрого доступа
        $incomeByAccount = $incomes->groupBy('account_id');
        $paymentByAccount = $payments->groupBy('account_id');

        // Общий остаток на сегодня (без будущих движений)
        // Вычисляем после определения $calcDayBalance

        // Вспомогательная функция: остаток по всем счетам на дату
        $calcDayBalance = function (string $dateStr) use ($accounts, $incomeByAccount, $paymentByAccount) {
            $dayBalance = 0;
            foreach ($accounts as $account) {
                $bal = $account->initial_balance;
                $accIncomes = $incomeByAccount[$account->id] ?? collect();
                $accPayments = $paymentByAccount[$account->id] ?? collect();
                $bal += $accIncomes->filter(fn ($inc) => $inc->planned_date->toDateString() <= $dateStr)->sum('amount');
                $bal -= $accPayments->filter(fn ($p) => $p->planned_date->toDateString() <= $dateStr)->sum('amount');
                $dayBalance += $bal;
            }
            return $dayBalance;
        };

        // Общий остаток на сегодня
        $totalBalance = $calcDayBalance($today);

        // Ближайший кассовый разрыв (следующие 30 дней)
        $nearestGap = null;
        $currentDate = Carbon::today();
        while ($currentDate->toDateString() <= $endGapDate) {
            $dateStr = $currentDate->toDateString();
            $dayBal = $calcDayBalance($dateStr);
            if ($dayBal < 0) {
                $nearestGap = ['date' => $dateStr, 'amount' => $dayBal];
                break;
            }
            $currentDate->addDay();
        }

        // Заявки на согласовании
        $pendingCount = Payment::where('status', 'pending')->count();

        // Сегодняшние движения
        $todayPayments = $payments->filter(fn ($p) => $p->planned_date->toDateString() === $today)->sum('amount');
        $todayIncome = $incomes->filter(fn ($inc) => $inc->planned_date->toDateString() === $today)->sum('amount');

        // График балансов (7 дней)
        $chart = [];
        for ($i = 0; $i < 7; $i++) {
            $dateStr = Carbon::today()->addDays($i)->toDateString();
            $chart[] = [
                'date' => Carbon::parse($dateStr)->translatedFormat('j M'),
                'balance' => $calcDayBalance($dateStr),
            ];
        }

        // Последние события
        $events = AuditLog::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($log) {
                $type = match (true) {
                    str_contains($log->action, 'reject') => 'danger',
                    str_contains($log->action, 'approv') || str_contains($log->action, 'confirm') => 'success',
                    default => 'info',
                };
                return [
                    'id' => $log->id,
                    'time' => $log->created_at->translatedFormat('j M, H:i'),
                    'text' => $log->object . ($log->details ? ' — ' . $log->details : ''),
                    'type' => $type,
                ];
            });

        return response()->json([
            'summary' => [
                'totalBalance' => $totalBalance,
                'nearestGapDate' => $nearestGap ? Carbon::parse($nearestGap['date'])->translatedFormat('j F Y') : null,
                'nearestGapAmount' => $nearestGap ? $nearestGap['amount'] : 0,
                'pendingCount' => $pendingCount,
                'todayPayments' => $todayPayments,
                'todayIncome' => $todayIncome,
            ],
            'chart' => $chart,
            'events' => $events,
        ]);
    }
}
