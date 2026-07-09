<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Currency;
use Illuminate\Support\Facades\Artisan;

class CurrencyController extends Controller
{
    public function index()
    {
        $currencies = Currency::all();

        if ($currencies->isEmpty()) {
            $this->seedDefaults();
            $currencies = Currency::all();
        }

        return response()->json($currencies->map(fn($c) => [
            'code' => $c->code,
            'name' => $c->name,
            'symbol' => $c->symbol,
            'rate_to_rub' => (float) $c->rate_to_rub,
            'updated_at' => $c->updated_at ? $c->updated_at->format('d.m.Y H:i') : '—',
        ]));
    }

    public function updateRate(Request $request, string $code)
    {
        $validated = $request->validate([
            'rate_to_rub' => 'required|numeric|min:0.01',
        ]);

        $code = strtoupper($code);
        $currency = Currency::where('code', $code)->first();

        if (!$currency) {
            return response()->json(['message' => 'Валюта не найдена'], 404);
        }

        $currency->update([
            'rate_to_rub' => $validated['rate_to_rub'],
            'updated_at' => now(),
        ]);

        return response()->json([
            'code' => $currency->code,
            'name' => $currency->name,
            'symbol' => $currency->symbol,
            'rate_to_rub' => (float) $currency->rate_to_rub,
            'updated_at' => $currency->updated_at->format('d.m.Y H:i'),
        ]);
    }

    public function refresh()
    {
        try {
            Artisan::call('currency:update-rates');
            $output = Artisan::output();

            return response()->json([
                'message' => 'Курсы обновлены с сайта ЦБ РФ',
                'detail' => trim($output),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Ошибка обновления курсов',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    private function seedDefaults()
    {
        $now = now();
        $defaults = [
            ['code' => 'RUB', 'name' => 'Российский рубль',   'symbol' => '₽', 'rate_to_rub' => 1,      'cbr_id' => null],
            ['code' => 'USD', 'name' => 'Доллар США',          'symbol' => '$', 'rate_to_rub' => 92.50,   'cbr_id' => 'R01235'],
            ['code' => 'EUR', 'name' => 'Евро',                'symbol' => '€', 'rate_to_rub' => 100.30,  'cbr_id' => 'R01239'],
            ['code' => 'AMD', 'name' => 'Армянский драм',     'symbol' => '֏', 'rate_to_rub' => 0.24,    'cbr_id' => 'R01060'],
            ['code' => 'GBP', 'name' => 'Фунт стерлингов',     'symbol' => '£', 'rate_to_rub' => 117.50,  'cbr_id' => 'R01035'],
            ['code' => 'JPY', 'name' => 'Японская иена',       'symbol' => '¥', 'rate_to_rub' => 0.6350,  'cbr_id' => 'R01820'],
            ['code' => 'KZT', 'name' => 'Казахстанский тенге', 'symbol' => '₸', 'rate_to_rub' => 19.20,   'cbr_id' => 'R01335'],
            ['code' => 'BYN', 'name' => 'Белорусский рубль',   'symbol' => 'Br','rate_to_rub' => 28.30,   'cbr_id' => 'R01090'],
            ['code' => 'TRY', 'name' => 'Турецкая лира',       'symbol' => '₺', 'rate_to_rub' => 2.65,    'cbr_id' => 'R01700'],
            ['code' => 'CHF', 'name' => 'Швейцарский франк',   'symbol' => '₣', 'rate_to_rub' => 103.80,  'cbr_id' => 'R01775'],
        ];

        foreach ($defaults as $d) {
            Currency::create(array_merge($d, ['updated_at' => $now]));
        }
    }
}
