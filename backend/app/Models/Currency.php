<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Currency extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'code',
        'name',
        'symbol',
        'rate_to_rub',
        'cbr_id',
        'updated_at',
    ];

    protected $casts = [
        'rate_to_rub' => 'decimal:4',
        'updated_at' => 'datetime',
    ];
}
