<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Обновление курсов валют с ЦБ РФ каждый день в 10:00 по МСК (7:00 UTC)
Schedule::command('currency:update-rates')->dailyAt('07:00');
