<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Registry extends Model
{
    use HasFactory;

    protected $fillable = [
        'registry_date',
        'status',
        'created_by',
        'approved_by',
    ];

    protected $casts = [
        'registry_date' => 'date',
    ];

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
