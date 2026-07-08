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

        $payments = Payment::where('planned_date', '<=', $endGapDate)
            ->where(function ($q) {
                $q->whereIn('status', ['pending', 'approved', 'in_registry', 'paid'])
                  ->orWhere(function ($q2) {
                      $q2->where('recurring', true)
                         ->where('template_status', '!=', 'paused');
                  });
            })
            ->get(['account_id', 'planned_date', 'amount']);

        // Группируем движения по account_id для быстрого доступа
        $incomeByAccount = $incomes->groupBy('account_id');
        $paymentByAccount = $payments->groupBy('account_id');

        // Вспомогательная функция: остаток по всем счетам на дату (с разбивкой по валютам)
        $calcDayBalance = function (string $dateStr) use ($accounts, $incomeByAccount, $paymentByAccount) {
            $byCurrency = [];
            foreach ($accounts as $account) {
                $cur = $account->currency;
                $bal = $account->initial_balance;
                $accIncomes = $incomeByAccount[$account->id] ?? collect();
                $accPayments = $paymentByAccount[$account->id] ?? collect();
                $bal += $accIncomes->filter(fn ($inc) => $inc->planned_date->toDateString() <= $dateStr)->sum('amount');
                $bal -= $accPayments->filter(fn ($p) => $p->planned_date->toDateString() <= $dateStr)->sum('amount');
                $byCurrency[$cur] = ($byCurrency[$cur] ?? 0) + $bal;
            }
            return $byCurrency;
        };

        // Общий остаток на сегодня (по валютам)
        $balanceByCurrency = $calcDayBalance($today);

        // Ближайший кассовый разрыв (следующие 30 дней)
        $nearestGap = null;
        $currentDate = Carbon::today();
        while ($currentDate->toDateString() <= $endGapDate) {
            $dateStr = $currentDate->toDateString();
            $dayBalByCur = $calcDayBalance($dateStr);
            foreach ($dayBalByCur as $cur => $bal) {
                if ($bal < 0) {
                    $nearestGap = ['date' => $dateStr, 'amount' => $bal, 'currency' => $cur];
                    break 2;
                }
            }
            $currentDate->addDay();
        }

        // Заявки на согласовании
        $pendingCount = Payment::where('status', 'pending')->count();

        // Сегодняшние движения (по валютам)
        $todayPaymentsByCur = [];
        $todayIncomeByCur = [];
        foreach ($accounts as $acc) {
            $cur = $acc->currency;
            $dayPay = $paymentByAccount[$acc->id] ?? collect();
            $dayInc = $incomeByAccount[$acc->id] ?? collect();
            $todayPaymentsByCur[$cur] = ($todayPaymentsByCur[$cur] ?? 0) + $dayPay->filter(fn ($p) => $p->planned_date->toDateString() === $today)->sum('amount');
            $todayIncomeByCur[$cur] = ($todayIncomeByCur[$cur] ?? 0) + $dayInc->filter(fn ($inc) => $inc->planned_date->toDateString() === $today)->sum('amount');
        }

        // График балансов (7 дней) — по основной валюте (RUB)
        $chart = [];
        for ($i = 0; $i < 7; $i++) {
            $dateStr = Carbon::today()->addDays($i)->toDateString();
            $dayBalByCur = $calcDayBalance($dateStr);
            $chart[] = [
                'date' => Carbon::parse($dateStr)->translatedFormat('j M'),
                'balance' => $dayBalByCur,
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
                'totalBalance' => $balanceByCurrency,
                'nearestGapDate' => $nearestGap ? Carbon::parse($nearestGap['date'])->translatedFormat('j F Y') : null,
                'nearestGapAmount' => $nearestGap ? $nearestGap['amount'] : 0,
                'nearestGapCurrency' => $nearestGap ? $nearestGap['currency'] : null,
                'pendingCount' => $pendingCount,
                'todayPayments' => $todayPaymentsByCur,
                'todayIncome' => $todayIncomeByCur,
            ],
            'chart' => $chart,
            'events' => $events,
        ]);
    }
}
