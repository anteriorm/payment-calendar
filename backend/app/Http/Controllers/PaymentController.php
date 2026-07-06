<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Http\Request;
use App\Models\Approval;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\AuditService;
use Carbon\Carbon;

class PaymentController extends Controller
{
    private function formatPayment(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'amount' => $payment->amount,
            'planned_date' => $payment->planned_date->toDateString(),
            'account_id' => $payment->account_id,
            'account_name' => $payment->account?->name ?? '',
            'counterparty_id' => $payment->counterparty_id,
            'counterparty' => $payment->counterparty?->name ?? '',
            'item_id' => $payment->item_id,
            'item' => $payment->item?->name ?? '',
            'purpose' => $payment->purpose ?? '',
            'priority' => $payment->priority,
            'status' => $payment->status,
            'created_by' => $payment->creator?->name ?? '',
            'registry_id' => $payment->registry_id,
        ];
    }

    public function index(Request $request)
    {
        $query = Payment::with(['account', 'counterparty', 'item', 'creator'])
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

        return response()->json($query->get()->map(fn($p) => $this->formatPayment($p)));
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
            'recurring' => 'sometimes|boolean',
            'recurring_frequency' => 'sometimes|in:monthly,weekly,quarterly',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = 'draft';

        $payment = DB::transaction(function () use ($validated) {
            $payment = Payment::create($validated);

            if (!empty($validated['recurring']) && !empty($validated['recurring_frequency'])) {
                $freq = $validated['recurring_frequency'];
                $date = Carbon::parse($validated['planned_date']);
                for ($i = 1; $i <= 6; $i++) {
                    $next = match ($freq) {
                        'weekly' => $date->copy()->addWeeks($i),
                        'monthly' => $date->copy()->addMonths($i),
                        'quarterly' => $date->copy()->addMonths($i * 3),
                    };
                    Payment::create([
                        'amount' => $validated['amount'],
                        'planned_date' => $next->toDateString(),
                        'account_id' => $validated['account_id'],
                        'counterparty_id' => $validated['counterparty_id'],
                        'item_id' => $validated['item_id'],
                        'purpose' => ($validated['purpose'] ?? '') . ' (повтор)',
                        'priority' => $validated['priority'],
                        'status' => 'draft',
                        'created_by' => Auth::id(),
                        'recurring' => true,
                        'recurring_frequency' => $freq,
                    ]);
                }
            }

            return $payment;
        });

        $payment->load(['account', 'counterparty', 'item', 'creator']);

        AuditService::log('payment_created', "Заявка №{$payment->id}", $payment->purpose);

        return response()->json($this->formatPayment($payment), 201);
    }

    public function show(Payment $payment)
    {
        $payment->load(['account', 'counterparty', 'item', 'creator', 'approvals.user']);
        $result = $this->formatPayment($payment);
        $result['approvals'] = $payment->approvals->map(fn($a) => [
            'id' => $a->id,
            'user' => $a->user?->name ?? '',
            'decision' => $a->decision,
            'comment' => $a->comment ?? '',
            'date' => $a->created_at?->toIso8601String() ?? '',
        ]);
        return response()->json($result);
    }

    public function update(Request $request, Payment $payment)
    {
        if (!in_array($payment->status, ['draft', 'rejected'])) {
            return response()->json(['message' => 'Редактирование разрешено только для черновиков и отклонённых заявок'], 403);
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
        $payment->load(['account', 'counterparty', 'item', 'creator']);

        return response()->json($this->formatPayment($payment));
    }

    public function destroy(Payment $payment)
    {
        if ($payment->status !== 'draft') {
            return response()->json(['message' => 'Удаление разрешено только для черновиков'], 403);
        }

        $payment->delete();
        return response()->json(['message' => 'Платёж удалён']);
    }

    // -------- Согласование --------

    public function submit(Payment $payment)
    {
        if (!in_array($payment->status, ['draft', 'rejected'])) {
            return response()->json(['message' => 'Только черновик или отклонённая заявка может быть отправлена'], 403);
        }

        $payment->status = 'pending';
        $payment->save();
        $payment->load(['account', 'counterparty', 'item', 'creator']);

        AuditService::log('payment_submitted', "Заявка №{$payment->id}", 'Отправлена на согласование');

        return response()->json(['message' => 'Заявка отправлена на согласование', 'payment' => $this->formatPayment($payment)]);
    }

    public function approve(Request $request, Payment $payment)
    {
        if ($payment->status !== 'pending') {
            return response()->json(['message' => 'Только заявка в статусе "на согласовании" может быть утверждена'], 403);
        }

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

        $payment->load(['account', 'counterparty', 'item', 'creator']);

        AuditService::log('payment_approved', "Заявка №{$payment->id}", $request->comment);

        return response()->json(['message' => 'Заявка утверждена', 'payment' => $this->formatPayment($payment)]);
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

        $payment->load(['account', 'counterparty', 'item', 'creator']);

        AuditService::log('payment_rejected', "Заявка №{$payment->id}", $request->comment);

        return response()->json(['message' => 'Заявка отклонена', 'payment' => $this->formatPayment($payment)]);
    }

    // -------- Перенос --------

    public function move(Request $request, Payment $payment)
    {
        $request->validate([
            'planned_date' => 'required|date',
        ]);

        if (!in_array($payment->status, ['draft', 'pending', 'approved'])) {
            return response()->json(['message' => 'Этот платёж нельзя перенести'], 403);
        }

        $oldDate = $payment->planned_date->toDateString();
        $payment->planned_date = $request->planned_date;
        $payment->save();
        $payment->load(['account', 'counterparty', 'item', 'creator']);

        AuditService::log('payment_moved', "Заявка №{$payment->id}", "{$oldDate} → {$request->planned_date}");

        return response()->json(['message' => 'Дата платежа изменена', 'payment' => $this->formatPayment($payment)]);
    }
}
