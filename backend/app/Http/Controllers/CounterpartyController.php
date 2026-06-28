<?php

namespace App\Http\Controllers;

use App\Models\Counterparty;
use Illuminate\Http\Request;

class CounterpartyController extends Controller
{
    public function index()
    {
        return response()->json(Counterparty::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'inn' => 'nullable|string|max:20',
            'details' => 'nullable|string',
        ]);

        $counterparty = Counterparty::create($validated);
        return response()->json($counterparty, 201);
    }

    public function show(Counterparty $counterparty)
    {
        return response()->json($counterparty);
    }

    public function update(Request $request, Counterparty $counterparty)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'inn' => 'sometimes|nullable|string|max:20',
            'details' => 'sometimes|nullable|string',
        ]);

        $counterparty->update($validated);
        return response()->json($counterparty);
    }

    public function destroy(Counterparty $counterparty)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещён'], 403);
        }

        $counterparty->delete();
        return response()->json(['message' => 'Контрагент удалён']);
    }
}
