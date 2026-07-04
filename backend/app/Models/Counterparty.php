<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Counterparty extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $fillable = [
        'name',
        'inn',
        'kpp',
        'bank_account',
        'bank_name',
        'bik',
        'type',
        'contact',
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
