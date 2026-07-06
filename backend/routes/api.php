<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\CounterpartyController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\IncomeController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\RegistryController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\RecurringController;
use App\Http\Controllers\CurrencyController;
use App\Http\Controllers\DashboardController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Справочники
    Route::apiResource('accounts', AccountController::class);
    Route::apiResource('counterparties', CounterpartyController::class);
    Route::apiResource('items', ItemController::class);

    // Платежи и поступления
    Route::apiResource('payments', PaymentController::class);
    Route::apiResource('incomes', IncomeController::class);

    // Согласование и перенос
    Route::post('/payments/{payment}/submit', [PaymentController::class, 'submit']);
    Route::post('/payments/{payment}/approve', [PaymentController::class, 'approve']);
    Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject']);
    Route::post('/payments/{payment}/move', [PaymentController::class, 'move']);

    // Действия с поступлениями
    Route::post('/incomes/{income}/confirmed', [IncomeController::class, 'markConfirmed']);
    Route::post('/incomes/{income}/received', [IncomeController::class, 'markReceived']);
    Route::post('/incomes/{income}/cancel', [IncomeController::class, 'cancel']);

    // Календарь
    Route::get('/calendar', [CalendarController::class, 'index']);

    // Реестры
    Route::apiResource('registries', RegistryController::class)->except(['update', 'destroy']);
    Route::post('/registries/{registry}/pay', [RegistryController::class, 'pay']);
    Route::get('/registries/{registry}/export', [RegistryController::class, 'export']);

    // Отчёты
    Route::get('/reports/balances', [ReportController::class, 'balances']);
    Route::get('/reports/cash-gaps', [ReportController::class, 'cashGaps']);
    Route::get('/reports/plan-fact', [ReportController::class, 'planFact']);

    // Аудит
    Route::get('/audit', [AuditController::class, 'index']);

    // Импорт
    Route::post('/import/payments', [ImportController::class, 'importPayments']);
    Route::post('/import/incomes', [ImportController::class, 'importIncomes']);

    // Маршруты согласования
    Route::get('/approval-routes', [ApprovalController::class, 'routes']);
    Route::get('/approvals', [ApprovalController::class, 'allApprovals']);
    Route::get('/payments/{payment}/approval', [ApprovalController::class, 'getApproval']);
    Route::post('/payments/{payment}/approval/start', [ApprovalController::class, 'startRoute']);
    Route::post('/payments/{payment}/approval/stages/{stageId}/approve', [ApprovalController::class, 'approveStage']);
    Route::post('/payments/{payment}/approval/stages/{stageId}/reject', [ApprovalController::class, 'rejectStage']);

    // Повторяющиеся платежи
    Route::apiResource('recurring', RecurringController::class);
    Route::post('/recurring/{recurring}/pause', [RecurringController::class, 'pause']);
    Route::post('/recurring/{recurring}/resume', [RecurringController::class, 'resume']);
    Route::post('/recurring/{recurring}/generate', [RecurringController::class, 'generate']);

    // Валюты
    Route::get('/currencies', [CurrencyController::class, 'index']);
    Route::put('/currencies/{code}/rate', [CurrencyController::class, 'updateRate']);

    // Дашборд
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Пользователи (admin)
    Route::apiResource('users', UserController::class);
});
