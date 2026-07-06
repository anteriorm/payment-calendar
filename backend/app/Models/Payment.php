<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'amount',
        'planned_date',
        'next_date',
        'end_date',
        'account_id',
        'counterparty_id',
        'item_id',
        'purpose',
        'recurring',
        'recurring_frequency',
        'priority',
        'status',
        'template_status',
        'created_count',
        'last_created',
        'created_by',
        'registry_id',
    ];

    protected $casts = [
        'amount' => 'integer',
        'planned_date' => 'date',
        'next_date' => 'date',
        'end_date' => 'date',
        'last_created' => 'date',
        'recurring' => 'boolean',
        'created_count' => 'integer',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function counterparty()
    {
        return $this->belongsTo(Counterparty::class);
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function registry()
    {
        return $this->belongsTo(Registry::class);
    }

    public function approvals()
    {
        return $this->hasMany(Approval::class);
    }
}
