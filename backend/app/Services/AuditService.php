<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public static function log(string $action, string $object, ?string $details = null): AuditLog
    {
        return AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'object' => $object,
            'details' => $details,
            'created_at' => now(),
        ]);
    }
}
