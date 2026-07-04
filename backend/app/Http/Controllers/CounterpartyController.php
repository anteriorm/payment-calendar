<?php

namespace App\Http\Controllers;

use App\Models\Counterparty;
use Illuminate\Http\Request;

class CounterpartyController extends Controller
{
    private function formatCounterparty(Counterparty $cp): array
    {
        return [
            'id' => $cp->id,
            'name' => $cp->name,
            'inn' => $cp->inn,
            'kpp' => $cp->kpp,
            'account' => $cp->bank_account,
            'bank' => $cp->bank_name,
            'bik' => $cp->bik,
            'type' => $cp->type,
            'contact' => $cp->contact,
        ];
    }

    public function index()
    {
        $counterparties = Counterparty::all()->map(fn($cp) => $this->formatCounterparty($cp));
        return response()->json($counterparties);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'inn' => 'nullable|string|max:20',
            'kpp' => 'nullable|string|max:20',
            'bank_account' => 'nullable|string|max:30',
            'bank_name' => 'nullable|string|max:255',
            'bik' => 'nullable|string|max:20',
            'type' => 'required|in:entity,individual',
            'contact' => 'nullable|string|max:255',
        ]);

        $counterparty = Counterparty::create($validated);
        return response()->json($this->formatCounterparty($counterparty), 201);
    }

    public function show(Counterparty $counterparty)
    {
        return response()->json($this->formatCounterparty($counterparty));
    }

    public function update(Request $request, Counterparty $counterparty)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'inn' => 'sometimes|nullable|string|max:20',
            'kpp' => 'sometimes|nullable|string|max:20',
            'bank_account' => 'sometimes|nullable|string|max:30',
            'bank_name' => 'sometimes|nullable|string|max:255',
            'bik' => 'sometimes|nullable|string|max:20',
            'type' => 'sometimes|in:entity,individual',
            'contact' => 'sometimes|nullable|string|max:255',
        ]);

        $counterparty->update($validated);
        return response()->json($this->formatCounterparty($counterparty));
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
