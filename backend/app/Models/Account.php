<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $fillable = [
        'name',
        'type',
        'currency',
        'initial_balance',
    ];

    protected $casts = [
        'initial_balance' => 'integer',
    ];

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function incomes()
    {
        return $this->hasMany(Income::class);
    }
}
