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

    // Отметка поступления как полученного
    Route::post('/incomes/{income}/received', [IncomeController::class, 'markReceived']);

    // Календарь
    Route::get('/calendar', [CalendarController::class, 'index']);

    // Реестры
    Route::apiResource('registries', RegistryController::class)->except(['update', 'destroy']);
    Route::post('/registries/{registry}/pay', [RegistryController::class, 'pay']);
    Route::get('/registries/{registry}/export', [RegistryController::class, 'export']);

    // Отчёты
    Route::get('/reports/balances', [ReportController::class, 'balances']);
    Route::get('/reports/cash-gaps', [ReportController::class, 'cashGaps']);
});
