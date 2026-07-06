<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Payment;
use App\Services\AuditService;

class RecurringController extends Controller
{
    public function index()
    {
        $templates = Payment::where('recurring', true)
            ->where('recurring_frequency', '!=', null)
            ->with(['account', 'counterparty', 'item', 'creator'])
            ->get()
            ->groupBy('recurring_frequency')
            ->flatMap(function ($group, $freq) {
                return $group->unique('purpose')->values()->map(function ($p) use ($freq) {
                    return [
                        'id' => $p->id,
                        'name' => $p->purpose ?? 'Повторяющийся платёж',
                        'counterparty' => $p->counterparty?->name ?? '',
                        'article' => $p->item?->name ?? '',
                        'account' => $p->account?->name ?? '',
                        'amount' => $p->amount,
                        'frequency' => $freq,
                        'start_date' => $p->planned_date->toDateString(),
                        'next_date' => $p->planned_date->toDateString(),
                        'status' => 'active',
                        'created_count' => 1,
                        'created_by' => $p->creator?->name ?? '',
                    ];
                });
            })
            ->values();

        return response()->json($templates);
    }

    public function store(Request $request)
    {
        return response()->json(['message' => 'Создание шаблонов пока не реализовано'], 501);
    }

    public function update(Request $request, $id)
    {
        return response()->json(['message' => 'Обновление шаблонов пока не реализовано'], 501);
    }

    public function destroy($id)
    {
        return response()->json(['message' => 'Удаление шаблонов пока не реализовано'], 501);
    }

    public function pause($id)
    {
        return response()->json(['message' => 'Пауза шаблонов пока не реализована'], 501);
    }

    public function resume($id)
    {
        return response()->json(['message' => 'Возобновление шаблонов пока не реализовано'], 501);
    }

    public function generate($id)
    {
        return response()->json(['message' => 'Генерация платежей пока не реализована'], 501);
    }
}
