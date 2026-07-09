<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Currency;
use Carbon\Carbon;

class UpdateCurrencyRates extends Command
{
    protected $signature = 'currency:update-rates';
    protected $description = 'Загрузить курсы валют с сайта ЦБ РФ';

    private const CBR_URL = 'https://www.cbr.ru/scripts/XML_daily.asp';
    private const CURRENCIES = [
        'USD' => ['name' => 'Доллар США',      'symbol' => '$', 'cbr_id' => 'R01235'],
        'EUR' => ['name' => 'Евро',             'symbol' => '€', 'cbr_id' => 'R01239'],
        'AMD' => ['name' => 'Армянский драм',     'symbol' => '֏', 'cbr_id' => 'R01060'],
        'GBP' => ['name' => 'Фунт стерлингов',  'symbol' => '£', 'cbr_id' => 'R01035'],
        'JPY' => ['name' => 'Японская иена',     'symbol' => '¥', 'cbr_id' => 'R01820'],
        'KZT' => ['name' => 'Казахстанский тенге','symbol' => '₸', 'cbr_id' => 'R01335'],
        'BYN' => ['name' => 'Белорусский рубль', 'symbol' => 'Br','cbr_id' => 'R01090'],
        'TRY' => ['name' => 'Турецкая лира',     'symbol' => '₺', 'cbr_id' => 'R01700'],
        'CHF' => ['name' => 'Швейцарский франк', 'symbol' => '₣', 'cbr_id' => 'R01775'],
    ];

    public function handle(): int
    {
        $this->info('Загрузка курсов с cbr.ru...');

        try {
            $xml = $this->fetchRates();
        } catch (\Exception $e) {
            $this->error("Не удалось загрузить курсы: {$e->getMessage()}");
            return self::FAILURE;
        }

        $updated = 0;
        $now = Carbon::now();

        foreach (self::CURRENCIES as $code => $meta) {
            $rate = $this->extractRate($xml, $meta['cbr_id'], $code);
            if ($rate === null) {
                $this->warn("Курс {$code} не найден в ответе ЦБ");
                continue;
            }

            Currency::updateOrCreate(
                ['code' => $code],
                [
                    'name' => $meta['name'],
                    'symbol' => $meta['symbol'],
                    'rate_to_rub' => $rate,
                    'cbr_id' => $meta['cbr_id'],
                    'updated_at' => $now,
                ]
            );
            $this->line("  {$code}: {$rate} ₽");
            $updated++;
        }

        // RUB — базовая валюта, курс всегда 1
        Currency::updateOrCreate(
            ['code' => 'RUB'],
            [
                'name' => 'Российский рубль',
                'symbol' => '₽',
                'rate_to_rub' => 1,
                'cbr_id' => null,
                'updated_at' => $now,
            ]
        );

        $this->info("Обновлено валют: {$updated}");
        return self::SUCCESS;
    }

    private function fetchRates(): \SimpleXMLElement
    {
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'header' => "Accept: application/xml\r\n",
            ],
        ]);

        $xml = @file_get_contents(self::CBR_URL . '?date_req=' . date('d/m/Y'), false, $context);
        if ($xml === false) {
            throw new \RuntimeException('HTTP-запрос к cbr.ru не удался');
        }

        return simplexml_load_string($xml);
    }

    private function extractRate(\SimpleXMLElement $xml, string $cbrId, string $code): ?float
    {
        foreach ($xml->Valute as $valute) {
            if ((string)$valute['ID'] === $cbrId) {
                $nominal = (int)$valute->Nominal;
                $value = str_replace(',', '.', (string)$valute->Value);
                return round((float)$value / $nominal, 4);
            }
        }

        return null;
    }
}
