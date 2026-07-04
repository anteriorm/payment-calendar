<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Payment;
use App\Models\Income;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use App\Services\AuditService;

class AccountController extends Controller
{
    private function formatAccount(Account $account): array
    {
        $incomeTotal = Income::where('account_id', $account->id)
            ->whereIn('status', ['planned', 'confirmed', 'received'])
            ->sum('amount');

        $paymentTotal = Payment::where('account_id', $account->id)
            ->whereIn('status', ['pending', 'approved', 'in_registry', 'paid'])
            ->sum('amount');

        return [
            'id' => $account->id,
            'name' => $account->name,
            'type' => $account->type,
            'currency' => $account->currency,
            'opening' => $account->initial_balance,
            'current' => $account->initial_balance + $incomeTotal - $paymentTotal,
        ];
    }

    public function index()
    {
        $accounts = Account::all()->map(fn($a) => $this->formatAccount($a));
        return response()->json($accounts);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:bank,cash',
            'currency' => 'required|string|max:3',
            'opening' => 'nullable|integer|min:0',
            'initial_balance' => 'nullable|integer|min:0',
        ]);

        $balance = $validated['opening'] ?? $validated['initial_balance'] ?? 0;
        $account = Account::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'currency' => $validated['currency'],
            'initial_balance' => $balance,
        ]);

        AuditService::log('account_created', "Счёт «{$account->name}»");

        return response()->json($this->formatAccount($account), 201);
    }

    public function show(Account $account)
    {
        return response()->json($this->formatAccount($account));
    }

    public function update(Request $request, Account $account)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:bank,cash',
            'currency' => 'sometimes|string|max:3',
            'opening' => 'nullable|integer|min:0',
            'initial_balance' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['opening'])) {
            $validated['initial_balance'] = $validated['opening'];
        }
        unset($validated['opening']);

        $account->update($validated);

        AuditService::log('account_updated', "Счёт «{$account->name}»");

        return response()->json($this->formatAccount($account));
    }

    public function destroy(Account $account)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещён'], 403);
        }

        try {
            $name = $account->name;
            $account->delete();
            AuditService::log('account_deleted', "Счёт «{$name}»");
        } catch (QueryException $e) {
            return response()->json(['message' => 'Невозможно удалить счёт — на него ссылаются платежи или поступления'], 422);
        }

        return response()->json(['message' => 'Счёт удалён']);
    }
}
