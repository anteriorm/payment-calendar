<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class CurrencyController extends Controller
{
    public function index()
    {
        return response()->json([
            ['code' => 'RUB', 'name' => 'Российский рубль', 'symbol' => '₽', 'rate_to_rub' => 1,      'updated_at' => now()->format('d.m.Y')],
            ['code' => 'USD', 'name' => 'Доллар США',        'symbol' => '$', 'rate_to_rub' => 92.50,  'updated_at' => now()->format('d.m.Y')],
            ['code' => 'EUR', 'name' => 'Евро',              'symbol' => '€', 'rate_to_rub' => 100.30, 'updated_at' => now()->format('d.m.Y')],
            ['code' => 'CNY', 'name' => 'Китайский юань',    'symbol' => '¥', 'rate_to_rub' => 12.75,  'updated_at' => now()->format('d.m.Y')],
        ]);
    }

    public function updateRate(Request $request, string $code)
    {
        $validated = $request->validate([
            'rate_to_rub' => 'required|numeric|min:0.01',
        ]);

        // In a real app this would update a currencies table.
        // For now return the updated currency.
        $currencies = [
            'RUB' => ['name' => 'Российский рубль', 'symbol' => '₽'],
            'USD' => ['name' => 'Доллар США',        'symbol' => '$'],
            'EUR' => ['name' => 'Евро',              'symbol' => '€'],
            'CNY' => ['name' => 'Китайский юань',    'symbol' => '¥'],
        ];

        $code = strtoupper($code);
        if (!isset($currencies[$code])) {
            return response()->json(['message' => 'Валюта не найдена'], 404);
        }

        return response()->json([
            'code' => $code,
            'name' => $currencies[$code]['name'],
            'symbol' => $currencies[$code]['symbol'],
            'rate_to_rub' => $validated['rate_to_rub'],
            'updated_at' => now()->format('d.m.Y'),
        ]);
    }
}
