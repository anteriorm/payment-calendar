<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Payment;

class ApprovalController extends Controller
{
    public function routes()
    {
        return response()->json([]);
    }

    public function allApprovals()
    {
        return response()->json([]);
    }

    public function getApproval(Payment $payment)
    {
        return response()->json([
            'paymentId' => $payment->id,
            'routeId' => 0,
            'stages' => [],
        ]);
    }

    public function startRoute(Request $request, Payment $payment)
    {
        return response()->json([
            'paymentId' => $payment->id,
            'routeId' => $request->routeId ?? 0,
            'stages' => [],
        ]);
    }

    public function approveStage(Request $request, Payment $payment, $stageId)
    {
        return response()->json([
            'id' => (int)$stageId,
            'status' => 'approved',
            'actionDate' => now()->format('d.m.Y H:i'),
            'comment' => $request->comment ?? '',
        ]);
    }

    public function rejectStage(Request $request, Payment $payment, $stageId)
    {
        return response()->json([
            'id' => (int)$stageId,
            'status' => 'rejected',
            'actionDate' => now()->format('d.m.Y H:i'),
            'comment' => $request->comment ?? '',
        ]);
    }
}
