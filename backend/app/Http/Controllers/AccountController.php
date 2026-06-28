<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function index()
    {
        return response()->json(Account::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:bank,cash',
            'currency' => 'required|string|max:3',
            'initial_balance' => 'nullable|integer|min:0',
        ]);

        $account = Account::create($validated);
        return response()->json($account, 201);
    }

    public function show(Account $account)
    {
        return response()->json($account);
    }

    public function update(Request $request, Account $account)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:bank,cash',
            'currency' => 'sometimes|string|max:3',
            'initial_balance' => 'sometimes|integer|min:0',
        ]);

        $account->update($validated);
        return response()->json($account);
    }

    public function destroy(Account $account)
    {
        // Только администратор может удалять
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещён'], 403);
        }

        $account->delete();
        return response()->json(['message' => 'Счёт удалён']);
    }
}
