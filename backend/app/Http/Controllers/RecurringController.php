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
            ->whereNotNull('recurring_frequency')
            ->with(['account', 'counterparty', 'item', 'creator'])
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'name' => $p->purpose ?? 'Повторяющийся платёж',
                    'counterparty' => $p->counterparty?->name ?? '',
                    'article' => $p->item?->name ?? '',
                    'account' => $p->account?->name ?? '',
                    'amount' => $p->amount,
                    'frequency' => $p->recurring_frequency,
                    'start_date' => $p->planned_date?->toDateString() ?? '',
                    'end_date' => $p->end_date?->toDateString(),
                    'next_date' => $p->next_date?->toDateString() ?? $p->planned_date?->toDateString() ?? '',
                    'status' => $p->template_status ?? 'active',
                    'last_created' => $p->last_created?->toDateString(),
                    'created_count' => $p->created_count ?? 0,
                    'purpose' => $p->purpose ?? '',
                    'priority' => $p->priority ?? 'medium',
                    'created_by' => $p->creator?->name ?? '',
                ];
            })
            ->values();

        return response()->json($templates);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'counterparty' => 'required|string|max:255',
            'article' => 'required|string|max:255',
            'account' => 'required|string|max:255',
            'amount' => 'required|integer|min:1',
            'frequency' => 'required|in:daily,weekly,monthly,quarterly,yearly',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'purpose' => 'nullable|string|max:500',
            'priority' => 'required|in:high,medium,low',
        ]);

        // Find related models by name
        $account = \App\Models\Account::where('name', $validated['account'])->first();
        $counterparty = \App\Models\Counterparty::where('name', $validated['counterparty'])->first();
        $item = \App\Models\Item::where('name', $validated['article'])->first();
        $user = auth()->user();

        if (!$account || !$counterparty || !$item) {
            return response()->json(['message' => 'Не найдены связанные справочники'], 422);
        }

        $payment = Payment::create([
            'amount' => $validated['amount'],
            'planned_date' => $validated['start_date'],
            'next_date' => $validated['start_date'],
            'end_date' => $validated['end_date'] ?? null,
            'account_id' => $account->id,
            'counterparty_id' => $counterparty->id,
            'item_id' => $item->id,
            'purpose' => $validated['purpose'] ?? $validated['name'],
            'recurring' => true,
            'recurring_frequency' => $validated['frequency'],
            'priority' => $validated['priority'],
            'status' => 'draft',
            'template_status' => 'active',
            'created_count' => 0,
            'created_by' => $user?->id,
        ]);

        $payment->load(['account', 'counterparty', 'item', 'creator']);

        return response()->json([
            'id' => $payment->id,
            'name' => $payment->purpose ?? 'Повторяющийся платёж',
            'counterparty' => $payment->counterparty?->name ?? '',
            'article' => $payment->item?->name ?? '',
            'account' => $payment->account?->name ?? '',
            'amount' => $payment->amount,
            'frequency' => $payment->recurring_frequency,
            'start_date' => $payment->planned_date?->toDateString() ?? '',
            'end_date' => $payment->end_date?->toDateString(),
            'next_date' => $payment->next_date?->toDateString() ?? '',
            'status' => $payment->template_status ?? 'active',
            'last_created' => $payment->last_created?->toDateString(),
            'created_count' => $payment->created_count ?? 0,
            'purpose' => $payment->purpose ?? '',
            'priority' => $payment->priority ?? 'medium',
            'created_by' => $payment->creator?->name ?? '',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $payment = Payment::where('recurring', true)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'counterparty' => 'sometimes|string|max:255',
            'article' => 'sometimes|string|max:255',
            'account' => 'sometimes|string|max:255',
            'amount' => 'sometimes|integer|min:1',
            'frequency' => 'sometimes|in:daily,weekly,monthly,quarterly,yearly',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date',
            'purpose' => 'nullable|string|max:500',
            'priority' => 'sometimes|in:high,medium,low',
        ]);

        $updateData = [];

        if (isset($validated['amount'])) {
            $updateData['amount'] = $validated['amount'];
        }
        if (isset($validated['start_date'])) {
            $updateData['planned_date'] = $validated['start_date'];
        }
        if (array_key_exists('end_date', $validated)) {
            $updateData['end_date'] = $validated['end_date'];
        }
        if (isset($validated['frequency'])) {
            $updateData['recurring_frequency'] = $validated['frequency'];
        }
        if (isset($validated['priority'])) {
            $updateData['priority'] = $validated['priority'];
        }
        if (array_key_exists('purpose', $validated)) {
            $updateData['purpose'] = $validated['purpose'];
        }

        if (isset($validated['account'])) {
            $account = \App\Models\Account::where('name', $validated['account'])->first();
            if ($account) $updateData['account_id'] = $account->id;
        }
        if (isset($validated['counterparty'])) {
            $counterparty = \App\Models\Counterparty::where('name', $validated['counterparty'])->first();
            if ($counterparty) $updateData['counterparty_id'] = $counterparty->id;
        }
        if (isset($validated['article'])) {
            $item = \App\Models\Item::where('name', $validated['article'])->first();
            if ($item) $updateData['item_id'] = $item->id;
        }

        if (isset($validated['name'])) {
            $updateData['purpose'] = $validated['name'];
        }

        $payment->update($updateData);
        $payment->load(['account', 'counterparty', 'item', 'creator']);

        return response()->json([
            'id' => $payment->id,
            'name' => $payment->purpose ?? 'Повторяющийся платёж',
            'counterparty' => $payment->counterparty?->name ?? '',
            'article' => $payment->item?->name ?? '',
            'account' => $payment->account?->name ?? '',
            'amount' => $payment->amount,
            'frequency' => $payment->recurring_frequency,
            'start_date' => $payment->planned_date?->toDateString() ?? '',
            'end_date' => $payment->end_date?->toDateString(),
            'next_date' => $payment->next_date?->toDateString() ?? '',
            'status' => $payment->template_status ?? 'active',
            'last_created' => $payment->last_created?->toDateString(),
            'created_count' => $payment->created_count ?? 0,
            'purpose' => $payment->purpose ?? '',
            'priority' => $payment->priority ?? 'medium',
            'created_by' => $payment->creator?->name ?? '',
        ]);
    }

    public function destroy($id)
    {
        $payment = Payment::where('recurring', true)->findOrFail($id);
        $payment->delete();

        return response()->json(['message' => 'Шаблон удалён']);
    }

    public function pause($id)
    {
        $payment = Payment::where('recurring', true)->findOrFail($id);
        $payment->update(['template_status' => 'paused']);

        return response()->json([
            'id' => $payment->id,
            'name' => $payment->purpose ?? 'Повторяющийся платёж',
            'counterparty' => $payment->counterparty?->name ?? '',
            'article' => $payment->item?->name ?? '',
            'account' => $payment->account?->name ?? '',
            'amount' => $payment->amount,
            'frequency' => $payment->recurring_frequency,
            'start_date' => $payment->planned_date?->toDateString() ?? '',
            'end_date' => $payment->end_date?->toDateString(),
            'next_date' => $payment->next_date?->toDateString() ?? '',
            'status' => 'paused',
            'last_created' => $payment->last_created?->toDateString(),
            'created_count' => $payment->created_count ?? 0,
            'purpose' => $payment->purpose ?? '',
            'priority' => $payment->priority ?? 'medium',
            'created_by' => $payment->creator?->name ?? '',
        ]);
    }

    public function resume($id)
    {
        $payment = Payment::where('recurring', true)->findOrFail($id);
        $payment->update(['template_status' => 'active']);

        return response()->json([
            'id' => $payment->id,
            'name' => $payment->purpose ?? 'Повторяющийся платёж',
            'counterparty' => $payment->counterparty?->name ?? '',
            'article' => $payment->item?->name ?? '',
            'account' => $payment->account?->name ?? '',
            'amount' => $payment->amount,
            'frequency' => $payment->recurring_frequency,
            'start_date' => $payment->planned_date?->toDateString() ?? '',
            'end_date' => $payment->end_date?->toDateString(),
            'next_date' => $payment->next_date?->toDateString() ?? '',
            'status' => 'active',
            'last_created' => $payment->last_created?->toDateString(),
            'created_count' => $payment->created_count ?? 0,
            'purpose' => $payment->purpose ?? '',
            'priority' => $payment->priority ?? 'medium',
            'created_by' => $payment->creator?->name ?? '',
        ]);
    }

    public function generate($id)
    {
        $template = Payment::where('recurring', true)->findOrFail($id);

        if ($template->template_status !== 'active') {
            return response()->json(['message' => 'Шаблон не активен'], 422);
        }

        // Create a new payment draft from the template
        $newPayment = Payment::create([
            'amount' => $template->amount,
            'planned_date' => $template->next_date ?? $template->planned_date,
            'account_id' => $template->account_id,
            'counterparty_id' => $template->counterparty_id,
            'item_id' => $template->item_id,
            'purpose' => $template->purpose,
            'recurring' => false,
            'priority' => $template->priority,
            'status' => 'draft',
            'created_by' => auth()->user()?->id,
        ]);

        // Update template stats
        $nextDate = $this->calculateNextDate($template->next_date ?? $template->planned_date, $template->recurring_frequency);
        $template->update([
            'last_created' => $template->next_date ?? $template->planned_date,
            'next_date' => $nextDate,
            'created_count' => ($template->created_count ?? 0) + 1,
        ]);

        return response()->json([
            'message' => 'Черновик платежа создан',
            'template_id' => $template->id,
            'payment_id' => $newPayment->id,
        ]);
    }

    private function calculateNextDate($currentDate, $frequency)
    {
        if (!$currentDate) return null;

        $date = \Carbon\Carbon::parse($currentDate);

        return match ($frequency) {
            'daily' => $date->addDay(),
            'weekly' => $date->addWeek(),
            'monthly' => $date->addMonth(),
            'quarterly' => $date->addQuarter(),
            'yearly' => $date->addYear(),
            default => $date->addMonth(),
        };
    }
}
