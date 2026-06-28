<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Http\Request;
use App\Models\Approval;
use Illuminate\Support\Facades\Auth;

class PaymentController extends Controller
{
    public function index()
    {
        $payments = Payment::with(['account', 'counterparty', 'item', 'creator'])
            ->orderBy('planned_date', 'asc')
            ->get();
        return response()->json($payments);
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
            'priority' => 'required|in:high,medium,low',
            'status' => 'sometimes|in:draft,pending,approved,rejected,in_registry,paid',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'draft';

        $payment = Payment::create($validated);
        return response()->json($payment, 201);
    }

    public function show(Payment $payment)
    {
        $payment->load(['account', 'counterparty', 'item', 'creator', 'approvals.user']);
        return response()->json($payment);
    }

    public function update(Request $request, Payment $payment)
    {
        // Только черновик можно редактировать
        if ($payment->status !== 'draft') {
            return response()->json(['message' => 'Редактирование разрешено только для черновиков'], 403);
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

        $payment->update($validated);
        return response()->json($payment);
    }

    public function destroy(Payment $payment)
    {
        // Только черновик можно удалить
        if ($payment->status !== 'draft') {
            return response()->json(['message' => 'Удаление разрешено только для черновиков'], 403);
        }

        $payment->delete();
        return response()->json(['message' => 'Платёж удалён']);
    }

    // -------- Согласование --------

    public function submit(Payment $payment)
    {
        if ($payment->status !== 'draft') {
            return response()->json(['message' => 'Только черновик можно отправить'], 403);
        }

        $payment->status = 'pending';
        $payment->save();

        return response()->json(['message' => 'Заявка отправлена на согласование', 'payment' => $payment]);
    }

    public function approve(Request $request, Payment $payment)
    {
        if ($payment->status !== 'pending') {
            return response()->json(['message' => 'Только заявка в статусе "на согласовании" может быть утверждена'], 403);
        }

        // Проверка роли: только менеджер или админ
        if (!in_array(Auth::user()->role, ['manager', 'admin'])) {
            return response()->json(['message' => 'У вас нет прав утверждать'], 403);
        }

        $payment->status = 'approved';
        $payment->save();

        Approval::create([
            'payment_id' => $payment->id,
            'user_id' => Auth::id(),
            'decision' => 'approved',
            'comment' => $request->comment,
        ]);

        return response()->json(['message' => 'Заявка утверждена', 'payment' => $payment]);
    }

    public function reject(Request $request, Payment $payment)
    {
        if ($payment->status !== 'pending') {
            return response()->json(['message' => 'Только заявка в статусе "на согласовании" может быть отклонена'], 403);
        }

        if (!in_array(Auth::user()->role, ['manager', 'admin'])) {
            return response()->json(['message' => 'У вас нет прав отклонять'], 403);
        }

        $payment->status = 'rejected';
        $payment->save();

        Approval::create([
            'payment_id' => $payment->id,
            'user_id' => Auth::id(),
            'decision' => 'rejected',
            'comment' => $request->comment,
        ]);

        return response()->json(['message' => 'Заявка отклонена', 'payment' => $payment]);
    }

    // -------- Перенос --------

    public function move(Request $request, Payment $payment)
    {
        $request->validate([
            'planned_date' => 'required|date',
        ]);

        // Можно переносить только если статус draft, pending, approved (не in_registry, paid, rejected)
        if (!in_array($payment->status, ['draft', 'pending', 'approved'])) {
            return response()->json(['message' => 'Этот платёж нельзя перенести'], 403);
        }

        $payment->planned_date = $request->planned_date;
        $payment->save();

        return response()->json(['message' => 'Дата платежа изменена', 'payment' => $payment]);
    }
}
