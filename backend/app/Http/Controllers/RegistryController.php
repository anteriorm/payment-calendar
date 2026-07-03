<?php

namespace App\Http\Controllers;

use App\Models\Registry;
use App\Models\Payment;
use Illuminate\Http\Request;

class RegistryController extends Controller
{
    public function index()
    {
        $registries = Registry::with(['payments', 'creator', 'approver'])->get();
        return response()->json($registries);
    }

    public function store(Request $request)
    {
        $request->validate([
            'registry_date' => 'required|date',
            'payment_ids' => 'required|array',
            'payment_ids.*' => 'exists:payments,id',
        ]);

        $payments = Payment::whereIn('id', $request->payment_ids)->get();

        foreach ($payments as $payment) {
            if ($payment->status !== 'approved') {
                return response()->json([
                    'message' => "Платёж ID {$payment->id} не согласован",
                ], 422);
            }
            if ($payment->registry_id) {
                return response()->json([
                    'message' => "Платёж ID {$payment->id} уже в другом реестре",
                ], 422);
            }
        }

        $registry = Registry::create([
            'registry_date' => $request->registry_date,
            'status' => 'created',
            'created_by' => auth()->id(),
        ]);

        foreach ($payments as $payment) {
            $payment->registry_id = $registry->id;
            $payment->status = 'in_registry';
            $payment->save();
        }

        $registry->load('payments');
        return response()->json($registry, 201);
    }

    public function show(Registry $registry)
    {
        $registry->load(['payments', 'creator', 'approver']);
        return response()->json($registry);
    }

    public function pay(Registry $registry)
    {
        if ($registry->status === 'paid') {
            return response()->json(['message' => 'Реестр уже оплачен'], 422);
        }

        $registry->status = 'paid';
        $registry->approved_by = auth()->id();
        $registry->save();

        foreach ($registry->payments as $payment) {
            $payment->status = 'paid';
            $payment->save();
        }

        return response()->json(['message' => 'Реестр оплачен', 'registry' => $registry]);
    }

    public function export(Registry $registry)
    {
        $registry->load('payments');

        $rows = [];
        $rows[] = ['ID', 'Дата', 'Контрагент', 'Сумма', 'Счёт', 'Статья', 'Назначение', 'Статус'];

        foreach ($registry->payments as $payment) {
            $rows[] = [
                $payment->id,
                $payment->planned_date,
                $payment->counterparty->name ?? '',
                $payment->amount / 100,
                $payment->account->name ?? '',
                $payment->item->name ?? '',
                $payment->purpose ?? '',
                $payment->status,
            ];
        }

        $filename = "registry_{$registry->id}_{$registry->registry_date}.csv";
        $handle = fopen('php://temp', 'w+');
        foreach ($rows as $row) {
            fputcsv($handle, $row, ';');
        }
        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        return response($content, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ]);
    }
}
