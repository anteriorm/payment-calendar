<?php

namespace App\Http\Controllers;

use App\Models\Income;
use Illuminate\Http\Request;

class IncomeController extends Controller
{
    public function index()
    {
        $incomes = Income::with(['account', 'counterparty', 'item'])
            ->orderBy('planned_date', 'asc')
            ->get();
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
            'status' => 'sometimes|in:planned,received,canceled',
        ]);

        $validated['status'] = $validated['status'] ?? 'planned';

        $income = Income::create($validated);
        return response()->json($income, 201);
    }

    public function show(Income $income)
    {
        $income->load(['account', 'counterparty', 'item']);
        return response()->json($income);
    }

    public function update(Request $request, Income $income)
    {
        $validated = $request->validate([
            'amount' => 'sometimes|integer|min:1',
            'planned_date' => 'sometimes|date',
            'account_id' => 'sometimes|exists:accounts,id',
            'counterparty_id' => 'sometimes|exists:counterparties,id',
            'item_id' => 'sometimes|exists:items,id',
            'purpose' => 'sometimes|nullable|string',
            'status' => 'sometimes|in:planned,received,canceled',
        ]);

        $income->update($validated);
        return response()->json($income);
    }

    public function destroy(Income $income)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещён'], 403);
        }

        $income->delete();
        return response()->json(['message' => 'Поступление удалено']);
    }

    // Отметка как полученное
    public function markReceived(Income $income)
    {
        if ($income->status !== 'planned') {
            return response()->json(['message' => 'Только плановые поступления можно отметить как полученные'], 403);
        }

        $income->status = 'received';
        $income->save();
        return response()->json(['message' => 'Поступление отмечено как полученное', 'income' => $income]);
    }
}
