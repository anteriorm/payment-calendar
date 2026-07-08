<?php

namespace App\Http\Controllers;

use App\Models\Income;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\AuditService;

class IncomeController extends Controller
{
    private function formatIncome(Income $income): array
    {
        return [
            'id' => $income->id,
            'amount' => $income->amount,
            'planned_date' => $income->planned_date->toDateString(),
            'account_id' => $income->account_id,
            'account_name' => $income->account?->name ?? '',
            'counterparty_id' => $income->counterparty_id,
            'counterparty' => $income->counterparty?->name ?? '',
            'item_id' => $income->item_id,
            'item' => $income->item?->name ?? '',
            'purpose' => $income->purpose ?? '',
            'priority' => $income->priority ?? 'medium',
            'status' => $income->status,
            'created_by' => $income->creator?->name ?? '',
        ];
    }

    public function index(Request $request)
    {
        $query = Income::with(['account', 'counterparty', 'item', 'creator'])
            ->orderBy('planned_date', 'asc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }

        if ($request->filled('counterparty_id')) {
            $query->where('counterparty_id', $request->counterparty_id);
        }

        if ($request->filled('date_from')) {
            $query->where('planned_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('planned_date', '<=', $request->date_to);
        }

        $incomes = $query->get()->map(fn($income) => $this->formatIncome($income));

        return response()->json($incomes);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|integer|min:1',
            'planned_date' => 'required|date',
            'account_id' => 'required|exists:accounts,id',
            'counterparty_id' => 'required|exists:counterparties,id',
            'item_id' => 'required|exists:items,id',
            'purpose' => 'nullable|string',
            'priority' => 'sometimes|in:high,medium,low',
            'status' => 'sometimes|in:planned,confirmed,received,canceled',
        ]);

        $validated['status'] = $validated['status'] ?? 'planned';
        $validated['priority'] = $validated['priority'] ?? 'medium';

        $income = Income::create($validated);
        $income->load(['account', 'counterparty', 'item']);

        AuditService::log('income_created', "Поступление №{$income->id}", $income->purpose);

        return response()->json($this->formatIncome($income), 201);
    }

    public function show(Income $income)
    {
        $income->load(['account', 'counterparty', 'item', 'creator']);
        return response()->json($this->formatIncome($income));
    }

    public function update(Request $request, Income $income)
    {
        if ($income->status !== 'planned') {
            return response()->json(['message' => 'Редактирование разрешено только для плановых поступлений'], 403);
        }

        $validated = $request->validate([
            'amount' => 'sometimes|integer|min:1',
            'planned_date' => 'sometimes|date',
            'account_id' => 'sometimes|exists:accounts,id',
            'counterparty_id' => 'sometimes|exists:counterparties,id',
            'item_id' => 'sometimes|exists:items,id',
            'purpose' => 'sometimes|nullable|string',
            'priority' => 'sometimes|in:high,medium,low',
        ]);

        $income->update($validated);
        $income->load(['account', 'counterparty', 'item', 'creator']);

        return response()->json($this->formatIncome($income));
    }

    public function destroy(Income $income)
    {
        if ($income->status !== 'planned') {
            return response()->json(['message' => 'Удаление разрешено только для плановых поступлений'], 403);
        }

        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещён'], 403);
        }

        $income->delete();
        return response()->json(['message' => 'Поступление удалено']);
    }

    public function markConfirmed(Income $income)
    {
        if ($income->status !== 'planned') {
            return response()->json(['message' => 'Только плановые поступления можно подтвердить'], 403);
        }

        $income->status = 'confirmed';
        $income->save();
        $income->load(['account', 'counterparty', 'item', 'creator']);

        AuditService::log('income_confirmed', "Поступление №{$income->id}", 'Подтверждено');

        return response()->json(['message' => 'Поступление подтверждено', 'income' => $this->formatIncome($income)]);
    }

    public function markReceived(Income $income)
    {
        if (!in_array($income->status, ['planned', 'confirmed'])) {
            return response()->json(['message' => 'Только плановые или подтверждённые поступления можно отметить как полученные'], 403);
        }

        $income->status = 'received';
        $income->save();
        $income->load(['account', 'counterparty', 'item', 'creator']);

        AuditService::log('income_received', "Поступление №{$income->id}", 'Отмечено как полученное');

        return response()->json(['message' => 'Поступление отмечено как полученное', 'income' => $this->formatIncome($income)]);
    }

    public function cancel(Income $income)
    {
        if (in_array($income->status, ['received', 'canceled'])) {
            return response()->json(['message' => 'Это поступление нельзя отменить'], 403);
        }

        $income->status = 'canceled';
        $income->save();
        $income->load(['account', 'counterparty', 'item', 'creator']);

        AuditService::log('income_canceled', "Поступление №{$income->id}", 'Отменено');

        return response()->json(['message' => 'Поступление отменено', 'income' => $this->formatIncome($income)]);
    }
}
