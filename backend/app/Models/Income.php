<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Income extends Model
{
    use HasFactory;

    protected $fillable = [
        'amount',
        'planned_date',
        'account_id',
        'counterparty_id',
        'item_id',
        'purpose',
        'status',
    ];

    protected $casts = [
        'amount' => 'integer',
        'planned_date' => 'date',
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
}
