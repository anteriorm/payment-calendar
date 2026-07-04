<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with('user')->orderBy('created_at', 'desc');

        if ($request->filled('user')) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->user . '%');
            });
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to . ' 23:59:59');
        }

        $perPage = $request->integer('per_page', 20);
        $logs = $query->paginate($perPage);

        $data = $logs->map(function ($log) {
            return [
                'id' => $log->id,
                'timestamp' => $log->created_at->format('Y-m-d H:i:s'),
                'user_name' => $log->user?->name ?? 'Система',
                'user_role' => $log->user?->role ?? '—',
                'action' => $log->action,
                'object' => $log->object,
                'details' => $log->details ?? '',
            ];
        });

        return response()->json([
            'data' => $data,
            'total' => $logs->total(),
        ]);
    }
}
