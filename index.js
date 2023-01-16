const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./databases/database.db');
const ExcelJS = require('exceljs');


db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (user_id INTEGER, balance REAL, admin INTEGER, position TEXT, referal INTEGER, banned INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, user_id INTEGER, amount INTEGER, approved INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS contracts (id INTEGER PRIMARY KEY, user_id INTEGER, amount INTEGER, days INTEGER, length INTEGER, profit INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS withdraw (id INTEGER PRIMARY KEY, user_id INTEGER, amount INTEGER, net TEXT)");
});


const token = '5620225286:AAEhkeoOKhg2O7zw6_S6YLN-mntPjKOhqDI'; // 5620225286:AAEhkeoOKhg2O7zw6_S6YLN-mntPjKOhqDI
const bot = new TelegramBot(token, {polling: true});
const bot_user_id = 'cryptoinvestfreedombot'


const freedom_link = 'https://freedom24.com/authentication/signup/?__lang__=ru&ref=mc_gc_general_f24_ru_17066694396&utm_campaign=mc_gc_general_f24_ru_17066694396_135610020469&utm_source=google&utm_medium=search&utm_term=m_freedom24&utm_content=135610020469_598492474497&gclid=Cj0KCQiA5NSdBhDfARIsALzs2EBmHEj9xFozw0IAkP9kwgxZ6PO3CnegYB38NqtmQK2paa5Lk-ktbMUaAqLiEALw_wcB';
const freedom_rates = 'https://ffin.ua/ru/reviews';

const admin_id = 5161613140; //5161613140
let orders = {};

function new_user(chatId, referal = 0) {
    db.serialize(() => {
        db.get('SELECT * FROM users WHERE user_id = ?', [chatId], (err, result) => {
            if (err) {
                console.log(err);
            } else {
                console.log(result);
                if (result == undefined) {
                    let stmt = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)");
                    stmt.run(chatId, 0, 0, "main_menu", referal, 0);
                    stmt.finalize();
                    console.log('NEW USER CREATED');
                } else {
                    set_stage(chatId, "main_menu");
                }
            }
        });
    });
}


function get_user(chatId) {
    return new Promise(
        (resolve, reject) => {
            db.serialize(() => {
                db.get('SELECT * FROM users WHERE user_id = ?', [chatId], (err, rows) => {
                    if (err) {reject(err);}
                    resolve(rows);
                });
            });
        }
    );
}



function add_money(user_id, ammount) {
    get_user(user_id).then(results => {
        let balance = results.balance;
        balance += ammount;
        db.serialize(() => {
            let stmt = db.prepare("UPDATE users SET balance = ? WHERE user_id = ?");
            stmt.run(balance, user_id);
            stmt.finalize();
        });
    });
}


function dump_db() {
    db.serialize(() => {
        db.all('SELECT * FROM users', (err, rows) => {
            if (err) {reject(err);}
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('users');
            const worksheet = workbook.getWorksheet('users');
            worksheet.columns = [
                { header: 'User Id', key: 'user_id' },
                { header: 'Balance', key: 'balance' },
                { header: 'Position', key: 'position' },
                { header: 'Referal Id', key: 'referal' }
            ];
            console.log(rows);
            rows.forEach(el => {
                worksheet.addRow(el);
            });
            db.serialize(() => {
                db.all('SELECT * FROM contracts', (err, rows) => {
                    if (err) {reject(err);}
                    const sheet = workbook.addWorksheet('contracts');
                    const worksheet = workbook.getWorksheet('contracts');
                    worksheet.columns = [
                        { header: 'Contract Id', key: 'id' },
                        { header: 'User Id', key: 'user_id' },
                        { header: 'Amount', key: 'amount' },
                        { header: 'Days', key: 'days' },
                        { header: 'Left', key: 'length' },
                        { header: 'Profit', key: 'profit' }
                    ];
                    console.log(rows);
                    rows.forEach(el => {
                        worksheet.addRow(el);
                    });
                    
                    workbook.xlsx.writeFile('dump.xlsx');
                    setTimeout(() => bot.sendDocument(admin_id, './dump.xlsx'), 300);
                });
            });
        });
    });
}


function set_stage(chatId, stage_name) {
    db.serialize(() => {
        let stmt = db.prepare("UPDATE users SET position = ? WHERE user_id = ?");
        stmt.run(stage_name, chatId);
        stmt.finalize();
        console.log('UPDATED POSITION');
    });
}


function new_order(chatId, amount) {
    let stmt = db.prepare("INSERT INTO orders (user_id, amount, approved) VALUES (?, ?, ?)");
    stmt.run(chatId, amount, 0);
    stmt.finalize();
}


function new_withdraw(chatId, amount, net) {
    let stmt = db.prepare("INSERT INTO withdraw (user_id, amount, net) VALUES (?, ?, ?)");
    stmt.run(chatId, amount, net);
    stmt.finalize();
}

function new_contract(chatId, amount, length, profit, days,) {
    let stmt = db.prepare("INSERT INTO contracts (user_id, amount, days, length, profit) VALUES (?, ?, ?, ?, ?)");
    stmt.run(chatId, amount, days, length, profit);
    stmt.finalize();
}



let main_menu_keyboard = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: false, // TRUE
        keyboard: [
            ["Пополнить Баланс", "Вывод Средств"],
            ["📄 Контракт 📄", "📝 Условия 📝"],
            ["🆘 Служба поддержки ( администратор ) 🆘"],
            ["📈 FREEDOM 24 📉"],
            ["🥇 МОЙ ПРОФИЛЬ 🥇"]
        ]
    }
}


accept_keyboard = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
            ["✅ Я согласен(а) с правилами ✅"]
        ]
    }
}

cancel_keyboard = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
            ["Отмена"]
        ]
    }
}


back_keyboard = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
            ["Назад"]
        ]
    }
}

contracts_keyboard = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
            ["📮 ОТ 1 до 7 дней 📮"],
            ["📮 ОТ 7 до 30 дней 📮"],
            ["📮 ОТ 30 до 60 дней 📮"],
            ["Отмена"]
        ]
    }
}

contracts_keyboard_1_7 = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
            ["1️⃣ДЕНЬ( ПРОБНЫЙ ПЕРИОД )"],
            ["3️⃣ДНЯ", "7️⃣ДНЕЙ"],
            ["Отмена"]
        ]
    }
}

contracts_keyboard_7_30 = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
            ["7️⃣ДНЕЙ (ОПТИМАЛЬНЫЙ ПЕРИОД )"],
            ["1️⃣4️⃣ДНЕЙ", "3️⃣0️⃣ДНЕЙ"],
            ["Отмена"]
        ]
    }
}

contracts_keyboard_30_60 = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
            ["3️⃣0️⃣ДНЕЙ (ДОЛГОСРОЧНЫЙ ПЕРИОД)"],
            ["4️⃣5️⃣ДНЕЙ", "6️⃣0️⃣ДНЕЙ"],
            ["Отмена"]
        ]
    }
}

fill_up_keyboard = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
            ["✅ 50 USDT Tron (TRC20) ✅"],
            ["✅ 100 USDT Tron (TRC20) ✅"],
            ["✅ 250 USDT Tron (TRC20) ✅"],
            ["✅ 500 USDT Tron (TRC20) ✅"],
            ["✅ 1000 USDT Tron (TRC20) ✅"], 
            ["🟢 ЖЕЛАЕМАЯ СУММА 🟢"],
            ["Отмена"]
        ]
    }
}

nets_keyboard = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
            ["BNB сеть - Smart Chain (BEP20)"],
            ["USDT сеть - Tron (TRC20)"],
            ["ETH сеть - (ERC20)"],
            ["BTC сеть - Bitcoin"],
            ["Отмена"]
        ]
    }
}

amount_keyboard = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
            ["📌 50 USDT 📌"],
            ["📌 100 USDT 📌"],
            ["📌 250 USDT 📌"],
            ["📌 500 USDT 📌"],
            ["📌 1000 USDT 📌"],
            ["⭕️ ЖЕЛАЕМАЯ СУММА ⭕️"],
            ["Отмена"]
        ]
    }
}

empty_keyboard = {
    reply_markup: {
        remove_keyboard: true
    }
}


text_0_balance = `ВАШ БАЛАНС РАВЕН 0 USDT 
Для подписания контракта пополните ваш баланс ! 
❗️Напоминаем минимальная сумма для подписания контракта составляет 50 USDT ❗️`


function generate_contract_message(balance) {
    return `ВАШ БАЛАНС РАВЕН ${balance} USDT 
Для подписания контракта пополните ваш баланс !
❗️Напоминаем минимальная сумма для подписания контракта составляет 50 USDT ❗️`
}

function generate_inlines_accept(order_id) {
    return {
        reply_markup: {
          inline_keyboard: [
            [{
                text: "Принять",
                callback_data: "accept_" + order_id,
              }],
            [{
                text: "Отклонить",
                callback_data: "reject_" + order_id,
              }]
            ]
        }
    };
}


function generate_inlines_withdraw(order_id) {
    return {
        reply_markup: {
          inline_keyboard: [
            [{
                text: "Принять",
                callback_data: "w_accept_" + order_id,
              }],
            [{
                text: "Отклонить",
                callback_data: "w_reject_" + order_id,
              }]
            ]
        }
    };
}


function generate_profile(chatId, username, balance, contract_am, contract_length, contract_left, contract_profit) {
    if (contract_left) {
        let realised_prof = parseInt((contract_length * 24 - contract_left) / 12) *  parseInt(contract_am / 100) * contract_profit;
        return `
💬Ваш ChatID: ${chatId}
👤Ваш логин: @${username}
💰Ваш баланс: ${balance} USDT
📄Ваш Контракт: ( ${contract_length} день/дней )
⚫️Сумма контракта: ( ${contract_am} USDT )
⚫️Заканчивается через: ( ${contract_left} часов )
⚫️Ожидаемая прибыль: ( ${parseInt(contract_am / 100 * contract_profit * contract_length * 2)} USDT )
⚫️Реализованая прибыль: ( ${realised_prof} USDT )
☑️Ваша реферальная ссылка: https://t.me/${bot_user_id}?start=${chatId}
Ваш процент с пополнений рефералов:
15%`
    } else {
        return `
💬Ваш ChatID: ${chatId}
👤Ваш логин: @${username}
💰Ваш баланс: ${balance} USDT
Ваша реферальная ссылка: https://t.me/${bot_user_id}?start=${chatId}
Ваш процент с пополнений рефералов: 15%`
    }
}

function generate_congrats_text(amount) {
    return `Примите наши поздравления 🎉 
Вы успешно подписали контракт на ${amount} USDT`
}


bot_works_3_yrs = `✅НАШ БОТ РАБОТАЕТ УЖЕ БОЛЕЕ 3-ёх ЛЕТ ✅
📌Мы зарабатываем за счет ваших инвестиций 📌
❗️Каждый участник нашего бота получает 5% с суммы его депозита ( один раз в 24 часа ) ❗️
💻 Мы инвестируем финансы в Брокерскую компанию FREEDOM 24 💻`


bnb_adress = `BNB Адрес для пополнения📌
0x301cb894142810bed99c3251209b
8bd9a8b2f
Сеть
BNB Smart Chain (BEP20)`

usdt_adress = `USDT Адрес для пополнения📌
TPWuXaPy4xZwPbrQuazodp08zKX81
4Y4F
7
Сеть
Tron (TRC20)`

eth_adress = `ETH Адрес для пополнения📌
0x301cb894142810bed99c3251209b
8bd9a8b2f
Сеть
Ethereum (ERC20)`

btc_adress = `ВТС Адрес для пополнения📌
1DNN8efMUXj4KJgi5xnRXP57yAPex3D
TiB
Сеть
Bitcoin`

already_have_contract = `У вас уже есть действующий контракт, дождитесь его окончания, после чего вы сможете ОФОРМИТЬ СЛЕДУЮЩИЙ КОНТРАКТ НА ДРУГОЙ СРОК И СУММУ.`

already_have_contract_withdraw = `У вас уже есть действующий контракт, дождитесь его окончания, после чего вы сможете вывести свои средства`

send_check_text = `‼️ Важно ‼️
После того как вы отправили средства пришлите чек о переводе боту`


conditions_text = `Благодарим за использование. Мы рады, что вы с нами. Пожалуйста, внимательно прочитайте это соглашение об Условиях обслуживания ❕

✅ НАШ БОТ РАБОТАЕТ УЖЕ БОЛЕЕ ОДНОГО ГОДА ✅

📌Мы зарабатываем за счет ваших инвестиций 

📌Каждый ИНВЕСТОР нашего бота получает от 5% до 10%   ( один раз в 12 часов ) 

📌Ваш процент зависит от суммы заключенного вами Контракта ! 
Сумма (МИН.) 50 и более USDT ( 5% )
Сумма (МИН.) 300 и более USDT ( 7% )
Сумма (МИН.) 1000 и более USDT ( 10% )

📌Мы инвестируем финансы в Брокерскую компанию FREEDOM 24 

📌Контракт не может быть расторгнут до его окончания. 

📌Мы не несем ответственность за ваши активы в случае перехода на сторонние сервисы.`


function decrease_length() {
    console.log('DECREASING LENGTH');
    db.serialize(() => {
        db.all('SELECT * FROM contracts WHERE length >= 0', (err, rows) => {
            if (err) {reject(err);}
            console.log(rows);
            if (rows[0]) {
                rows.forEach(el => {
                    if (el.length == 0) {
                        bot.sendMessage(el.user_id, 'Время вашего контракта вышло, вы можете заключить новый!');
                        update_contract_length(el.id, el.length - 1);
                        add_money(el.user_id, el.amount / 100 * el.profit * el.days * 2);
                    } else {
                        update_contract_length(el.id, el.length - 1);
                    }
                });
            }
        });
    });
}


setInterval(decrease_length, 60 * 60 * 1000);


function update_contract_length(id, length) {
    db.serialize(() => {
        db.run('UPDATE contracts SET length = ? WHERE id = ?', [length, id]);
    });
}


bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const username = msg.chat.username;
    const text = msg.text;

    if (text) {
        if (text.includes('/start')) {
            let referal = parseInt(text.slice(7));
            console.log(referal);
            if (referal) {
                console.log(referal);
            }
            new_user(chatId, referal);
            
            bot.sendMessage(chatId, 'Поздравляем! Вы подписались на cryptoinvestbot.');
            bot.sendMessage(chatId, conditions_text, accept_keyboard);
            return;
        } else if (text == '/dump' && chatId == admin_id) {
            dump_db();
        }
    
        get_user(chatId).then(results => {
            if (!results) {
                new_user(chatId);
                set_stage(chatId, "main_menu");
                bot.sendMessage(chatId, 'Похоже произошла ошибка, перенаправляем в главное меню', main_menu_keyboard);
            } else {
                if (text == "Отмена") {
                    set_stage(chatId, "main_menu");
                    bot.sendMessage(chatId, 'Отменено.', main_menu_keyboard);
                } else if (text == 'Назад') {
                    set_stage(chatId, "main_menu");
                    bot.sendMessage(chatId, 'Возвращаемся', main_menu_keyboard);
                } else if (text == '📄 Контракт 📄') {
                    db.serialize(() => {
                        db.all('SELECT * FROM contracts WHERE user_id = ? AND length >= 0', [chatId], (err, rows) => {
                            if (err) {reject(err);}
                            console.log(rows);
                            if (!rows[0]) {
                                set_stage(chatId, "contract_choose");
                                bot.sendMessage(chatId, `На какой срок вы желаете заключить контракт?`, contracts_keyboard);
                            } else {
                                set_stage(chatId, "main_menu");
                                bot.sendMessage(chatId, already_have_contract, main_menu_keyboard);
                            }
                        });
                    });
                } else if (results.position == 'contract_choose') {
                    let send_keys;
                    if (text == '📮 ОТ 1 до 7 дней 📮') {
                        set_stage(chatId, "contract_choose_1_7");
                        send_keys = contracts_keyboard_1_7;
                    } else if (text == '📮 ОТ 7 до 30 дней 📮') {
                        set_stage(chatId, "contract_choose_7_30");
                        send_keys = contracts_keyboard_7_30;
                    } else if (text == '📮 ОТ 30 до 60 дней 📮') {
                        set_stage(chatId, "contract_choose_30_60");
                        send_keys = contracts_keyboard_30_60;
                    }
                    set_stage(chatId, "contract_choose_day");
                    bot.sendMessage(chatId, 'Какой из ВАРИАНТОВ вам подходит больше?', send_keys);
                } else if (results.position == 'contract_choose_day') {
                    if (text == '1️⃣ДЕНЬ( ПРОБНЫЙ ПЕРИОД )') {
                        orders[chatId] = {'length': 1};
                    } else if (text == '3️⃣ДНЯ') {
                        orders[chatId] = {'length': 3};
                    } else if (text == '7️⃣ДНЕЙ' || text == '7️⃣ДНЕЙ (ОПТИМАЛЬНЫЙ ПЕРИОД )') {
                        orders[chatId] = {'length': 7};
                    } else if (text == '1️⃣4️⃣ДНЕЙ') {
                        orders[chatId] = {'length': 14};
                    } else if (text == '3️⃣0️⃣ДНЕЙ'|| text == '3️⃣0️⃣ДНЕЙ (ДОЛГОСРОЧНЫЙ ПЕРИОД)' ) {
                        orders[chatId] = {'length': 30};
                    } else if (text == '4️⃣5️⃣ДНЕЙ') {
                        orders[chatId] = {'length': 45};
                    }  else if (text == '6️⃣0️⃣ДНЕЙ') {
                        orders[chatId] = {'length': 60};
                    }
                    if (results.balance == 0) {
                        set_stage(chatId, "main_menu");
                        bot.sendMessage(chatId, text_0_balance, main_menu_keyboard);
                    } else if (results.balance < 50) {
                        set_stage(chatId, "main_menu");
                        bot.sendMessage(chatId, generate_contract_message(results.balance), main_menu_keyboard);
                    } else {
                        set_stage(chatId, "contract_amount");
                        bot.sendMessage(chatId, 'НАПИШИТЕ НА КАКУЮ СУММУ ВЫ ЖЕЛАЕТЕ ЗАКЛЮЧИТЬ КОНТРАКТ ?', empty_keyboard);
                    }
                } else if (results.position == 'contract_amount') {
                    try {
                        let _am = parseInt(text);
                        console.log(_am);
                        if (!_am) {
                            set_stage(chatId, "contract_amount");
                            bot.sendMessage(chatId, 'МИНИМАЛЬНАЯ СУММА ДЛЯ ПОДПИСАНИЯ КОНТРАКТА СОСТАВЛЯЕТ 50 USDT', empty_keyboard);
                        } else {
                            if (_am >= 50) {
                                if (_am > results.balance) {
                                    set_stage(chatId, "contract_amount");
                                    bot.sendMessage(chatId, `Сумма превышает ваш баланс в ${results.balance} USDT`, empty_keyboard);
                                } else {
                                    orders[chatId]['amount'] = _am;
                                    set_stage(chatId, "contract_accept");
                                    bot.sendMessage(chatId, `ВЫ УВЕРЕНЫ что хотите продолжить?`, {
                                        reply_markup: {
                                          inline_keyboard: [
                                            [{
                                                text: "✅ ДА ✅",
                                                callback_data: "continue_" + chatId,
                                              }],
                                            [{
                                                text: "❌НЕТ ❌",
                                                callback_data: "break_" + chatId,
                                              }]
                                            ]
                                        }
                                    });
                                }
                            } else {
                                set_stage(chatId, "contract_amount");
                                bot.sendMessage(chatId, `МИНИМАЛЬНАЯ СУММА ДЛЯ ПОДПИСАНИЯ КОНТРАКТА СОСТАВЛЯЕТ 50 USDT`, empty_keyboard);
                            }
                        }
                    } catch {
                        set_stage(chatId, "contract_amount");
                        bot.sendMessage(chatId, `МИНИМАЛЬНАЯ СУММА ДЛЯ ПОДПИСАНИЯ КОНТРАКТА СОСТАВЛЯЕТ 50 USDT`, empty_keyboard);
                    }
                } else if (text == '📝 Условия 📝') {
                    bot.sendMessage(chatId, conditions_text, back_keyboard);
                } else if (text == '✅ Я согласен(а) с правилами ✅') {
                    bot.sendMessage(chatId, '🎉', main_menu_keyboard);
                } else if (text == '🆘 Служба поддержки ( администратор ) 🆘') {
                    bot.sendMessage(chatId, '@investadmincrypto', main_menu_keyboard);
                } else if (text == '📈 FREEDOM 24 📉') {
                    set_stage(chatId, "freedom_info");
                    bot.sendMessage(chatId, '⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️', {
                        reply_markup: {
                            resize_keyboard: true,
                            one_time_keyboard: true,
                            keyboard: [
                                ["📎 Получить Ссылку 📎"],
                                ["🖇️ Посмотреть Отзывы 🖇️"],
                                ["Отмена"]
                            ]
                        }
                    });
                } else if (results.position == 'freedom_info') {
                    if (text == '📎 Получить Ссылку 📎') {
                        bot.sendMessage(chatId, freedom_link, main_menu_keyboard);
                        set_stage(chatId, "main_menu");
                    } else if (text == '🖇️ Посмотреть Отзывы 🖇️') {
                        bot.sendMessage(chatId, freedom_rates, main_menu_keyboard);
                        set_stage(chatId, "main_menu");
                    }
                } else if (text == '🥇 МОЙ ПРОФИЛЬ 🥇') {
                    db.serialize(() => {
                        db.all('SELECT * FROM contracts WHERE user_id = ? AND length >= 0', [chatId], (err, rows) => {
                            if (err) {reject(err);}
                            console.log(rows);
                            if (!rows[0]) {
                                bot.sendMessage(chatId, generate_profile(chatId, username, results.balance), main_menu_keyboard);
                            } else {
                                bot.sendMessage(chatId, generate_profile(chatId, username, results.balance, rows[0].amount, rows[0].days, rows[0].length, rows[0].profit), main_menu_keyboard);
                            }
                        });
                    });
                    
                    // set_stage(chatId, "profile");
                    // bot.sendMessage(chatId, '✏️', {
                    //     reply_markup: {
                    //         resize_keyboard: true,
                    //         one_time_keyboard: true,
                    //         keyboard: [
                    //             ["⚖️ МОЙ БАЛАНС ⚖️"],
                    //             ["🪫 МОЯ ПРИБЫЛЬ 🔋"],
                    //             ["Отмена"]
                    //         ]
                    //     }
                    // });
                } else if (results.position == 'profile') {
                    if (text == '⚖️ МОЙ БАЛАНС ⚖️') {
                        set_stage(chatId, "main_menu");
                        bot.sendMessage(chatId, `Ваш баланс на данный момент составляет ${results.balance} USDT`, main_menu_keyboard);
                    } else if (text == '🪫 МОЯ ПРИБЫЛЬ 🔋') {
                        set_stage(chatId, "main_menu");
                        bot.sendMessage(chatId, `Ваша прибыль на данный момент составляет хз сколько USDT`, main_menu_keyboard);
                    }
                } else if (text == 'Пополнить Баланс') {
                    set_stage(chatId, "fill_up");
                    bot.sendMessage(chatId, `На какую сумму вы хотели бы пополнить свой БАЛАНС ?`, fill_up_keyboard);
                } else if (results.position == 'fill_up') {
                    // if (fill_up_keyboard.reply_markup.keyboard.includes(text)) {
                    //     orders[username] = {'ammount': text};
                    //     set_stage(chatId, "fill_up_nets");
                    //     bot.sendMessage(chatId, `Выберете вариант который для вас более УДОБНЫЙ :`, nets_keyboard);
                    // } else {
                    //     set_stage(chatId, "fill_up");
                    //     bot.sendMessage(chatId, `На какую сумму вы хотели бы пополнить свой БАЛАНС ?`, fill_up_keyboard);
                    // }
                    if (text == '🟢 ЖЕЛАЕМАЯ СУММА 🟢') {
                        set_stage(chatId, "fill_up_amount_self");
                        bot.sendMessage(chatId, `Введите желаемую сумму (минимум 50 USDT)`, empty_keyboard);
                    } else {
                        orders[username] = {'ammount': text};
                        set_stage(chatId, "fill_up_nets");
                        bot.sendMessage(chatId, `Выберете вариант который для вас более УДОБНЫЙ :`, nets_keyboard);
                    }
                } else if (results.position == 'fill_up_amount_self') {
                    try {
                        let _am = parseInt(text);
                        console.log(_am);
                        if (!_am) {
                            set_stage(chatId, "fill_up_amount_self");
                            bot.sendMessage(chatId, `Введите желаемую сумму (минимум 50 USDT)`, cancel_keyboard);
                        } else {
                            if (_am >= 50) {
                                orders[username] = {'ammount': '$' + text};
                                console.log(orders)
                                set_stage(chatId, "fill_up_nets");
                                bot.sendMessage(chatId, `Выберете вариант который для вас более УДОБНЫЙ :`, nets_keyboard);
                            } else {
                                set_stage(chatId, "fill_up_amount_self");
                                bot.sendMessage(chatId, `Сумма от 50 USDT`, cancel_keyboard);
                            }
                        }
                    } catch {
                        set_stage(chatId, "fill_up_amount_self");
                        bot.sendMessage(chatId, `Введите желаемую сумму (минимум 50 USDT)`, empty_keyboard);
                    }
                } else if (results.position == 'fill_up_nets') {
                    // if (nets_keyboard.reply_markup.keyboard.includes(text)) {
                        
                    // } else {
                    //     set_stage(chatId, "fill_up_nets");
                    //     bot.sendMessage(chatId, `Выберете вариант который для вас более УДОБНЫЙ :`, nets_keyboard);
                    // }
                    orders[username]['net'] = text;
                    console.log(orders);
                    let amm = parseInt(orders[username]['ammount'].slice(1));
                    console.log(parseInt(orders[username]['ammount'].slice(1)));
                    new_order(chatId, amm);
                    db.serialize(() => {
                        db.all('SELECT * FROM orders WHERE user_id = ?', [chatId], (err, rows) => {
                            if (err) {reject(err);}
                            let name = msg.from.first_name + ' ' + msg.from.last_name;
                            name = name.replace(' undefined', '');
                            bot.sendMessage(admin_id, `Новый заказ в ожидании\n@${username} (${name})\n${orders[username]['ammount']}\n${orders[username]['net']}`, generate_inlines_accept(rows.pop()['id']));
                        });
                    });
                    let send_text = bnb_adress;
                    if (text == 'BNB сеть - Smart Chain (BEP20)') {send_text = bnb_adress}
                    else if (text == 'USDT сеть - Tron (TRC20)') {send_text = usdt_adress}
                    else if (text == 'ETH сеть - (ERC20)') {send_text = eth_adress}
                    else if (text == 'BTC сеть - Bitcoin') {send_text = btc_adress}
                    set_stage(chatId, "waiting_screenshot");
                    bot.sendMessage(chatId, send_text).then(() => {     // IF MESSAGE WITH CHECKS SENDS BEFORE I NEED
                        bot.sendMessage(chatId, send_check_text, empty_keyboard);
                    });
                } else if(results.position == 'waiting_screenshot') {
                    bot.sendMessage(chatId, 'Отправьте скриншот чека', empty_keyboard);
                } else if (text == 'Вывод Средств') {
                    db.serialize(() => {
                        db.all('SELECT * FROM contracts WHERE user_id = ? AND length >= 0', [chatId], (err, rows) => {
                            if (err) {reject(err);}
                            console.log(rows);
                            if (!rows[0]) {
                                set_stage(chatId, "withdraw_amount");
                                bot.sendMessage(chatId, `Какую сумму вы желаете вывести на свой Кошелек ?`, amount_keyboard);
                            } else {
                                set_stage(chatId, "main_menu");
                                bot.sendMessage(chatId, already_have_contract_withdraw, main_menu_keyboard);
                            }
                        });
                    });
                    
                } else if (results.position == 'withdraw') {
                    // if (nets_keyboard.reply_markup.keyboard.includes(text)) {
                    //     orders[username] = {'net': text};
                    //     set_stage(chatId, "withdraw_amount");
                    //     bot.sendMessage(chatId, `Какую сумму вы желаете вывести на свой Кошелек ?`, amount_keyboard);
                    // } else {
                    //     set_stage(chatId, "withdraw");
                    //     bot.sendMessage(chatId, `Через какую сеть вы хотите вывести свои средства ?`, nets_keyboard);
                    // }
                    orders[username]['net'] = text;
                    set_stage(chatId, "withdraw_address");
                    bot.sendMessage(chatId, `Введите адрес кошелька для вывода средств`, empty_keyboard);
                } else if (results.position == 'withdraw_amount') {
                    if (text == "⭕️ ЖЕЛАЕМАЯ СУММА ⭕️") {
                        set_stage(chatId, "withdraw_amount_self_type");
                        bot.sendMessage(chatId, `Какую сумму вы хотите вывести?\nМинимальная сумма для вывода: 50 USDT!`, empty_keyboard);
                    } else {
                        let _am = parseInt(text.slice(2, 7));
                        if (!_am) {
                            set_stage(chatId, "withdraw_amount");
                            bot.sendMessage(chatId, `Какую сумму вы желаете вывести на свой Кошелек ?`, amount_keyboard);
                        } else {
                            orders[username] = {'amount': _am, 'net': undefined};
                            set_stage(chatId, "withdraw");
                            bot.sendMessage(chatId, `Через какую сеть вы хотите вывести свои средства ?`, nets_keyboard);
                        }
                    }
                } else if (results.position == 'withdraw_amount_self_type') {
                    try {
                        let _am = parseInt(text);
                        console.log(_am);
                        if (!_am) {
                            set_stage(chatId, "withdraw_amount_self_type");
                            bot.sendMessage(chatId, `Какую сумму вы хотите вывести?\nМинимальная сумма для вывода: 50 USDT!`, empty_keyboard);
                        } else {
                            if (_am >= 50) {
                                if (_am > results.balance) {
                                    set_stage(chatId, "withdraw_amount_self_type");
                                    bot.sendMessage(chatId, `Данная сумма превышает ваш баланс, ваш баланс составляет ${results.balance} USDT`, cancel_keyboard);
                                } else {
                                    orders[username] = {'amount': _am}
                                    set_stage(chatId, "withdraw");
                                    bot.sendMessage(chatId, `Через какую сеть вы хотите вывести свои средства ?`, nets_keyboard);
                                }
                            } else {
                                set_stage(chatId, "withdraw_amount_self_type");
                                bot.sendMessage(chatId, `Введите сумму свыше 50 USDT`, empty_keyboard);
                            }
                        }
                    } catch {
                        set_stage(chatId, "withdraw_amount_self_type");
                        bot.sendMessage(chatId, `Какую сумму вы хотите вывести?`, empty_keyboard);
                    }
                } else if (results.position == 'withdraw_address') {
                    orders[username]['address'] = text;
                    let name = msg.from.first_name + ' ' + msg.from.last_name;
                    name = name.replace(' undefined', '');
                    new_withdraw(chatId, orders[username]['amount'], orders[username]['net']);
                    db.serialize(() => {
                        db.all('SELECT * FROM withdraw WHERE user_id = ?', [chatId], (err, rows) => {
                            if (err) {reject(err);}
                            bot.sendMessage(admin_id, `Новый заказ в ожидании\n@${username} (${name})\n${orders[username]['amount']}\n${orders[username]['net']}\n${text}`, generate_inlines_withdraw(rows.pop()['id']));
                        });
                    });
                    bot.sendMessage(chatId, 'Заказ отправлен администратору бота, ожидайте платежа', main_menu_keyboard);
                    set_stage(chatId, "main_menu");
                }
            }
        });
    } else if (msg.photo) {
        get_user(chatId).then(results => {
            if (!results) {
                new_user(chatId);
                bot.sendMessage(chatId, 'Поздравляем! Вы подписались на cryptoinvestbot.', main_menu_keyboard);
            } else if (results.position == 'waiting_screenshot') {
                bot.forwardMessage(admin_id, chatId, msg.message_id);
                bot.sendMessage(chatId, 'Чек перенаправлен администратору бота, ожидайте подтверждения платежа', main_menu_keyboard);
                set_stage(chatId, "main_menu");
            }
        });
    }




    // bot.sendMessage(chatId, text);
});

bot.on("polling_error", console.log);

bot.on("callback_query", (msg) => {
    const data = msg.data;
    console.log(data);
    bot.editMessageReplyMarkup({
        reply_markup: {inline_keyboard:[]}
    },
    {
        chat_id: msg.from.id,
        message_id: msg.message.message_id
    });

    if (data.slice(0, 6) == 'accept') {
        const order_id = parseInt(data.slice(7));
        db.serialize(() => {
            db.get('SELECT * FROM orders WHERE id = ?', [order_id], (err, rows) => {
                if (err) {reject(err);}
                console.log(rows);
                add_money(rows.user_id, rows.amount);
                bot.sendMessage(rows.user_id, `✅ Ваш заказ на пополнение #${rows.id} на сумму ${rows.amount} USDT был подтвержден ✅`);
                get_user(rows.user_id).then(results => {
                    if (results.referal) {
                        let _amm = parseInt(rows.amount / 100 * 15);
                        add_money(results.referal, _amm);
                        bot.sendMessage(results.referal, `Ваш реферал пополнил счет, вам начисленно ${_amm} USDT`);
                    }
                });
            });
        });
    } else if (data.slice(0, 6) == 'reject') {
        const order_id = parseInt(data.slice(7));
        db.serialize(() => {
            db.get('SELECT * FROM orders WHERE id = ?', [order_id], (err, rows) => {
                if (err) {reject(err);}
                console.log(rows);
                bot.sendMessage(rows.user_id, `Ваш заказ на пополнение #${rows.id} на сумму ${rows.amount} USDT был отклонен`);
            });
        });
    } else if (data.slice(0, 8) == 'w_accept') {
        const order_id = parseInt(data.slice(9));
        db.serialize(() => {
            db.get('SELECT * FROM withdraw WHERE id = ?', [order_id], (err, rows) => {
                if (err) {reject(err);}
                console.log(rows);
                add_money(rows.user_id, rows.amount * -1);
                bot.sendMessage(rows.user_id, `✅ Ваш заказ на вывод #${rows.id} на сумму ${rows.amount} USDT был подтвержден ✅`);
            });
        });
    } else if (data.slice(0, 8) == 'w_reject') {
        const order_id = parseInt(data.slice(9));
        db.serialize(() => {
            db.get('SELECT * FROM withdraw WHERE id = ?', [order_id], (err, rows) => {
                if (err) {reject(err);}
                console.log(rows);
                bot.sendMessage(rows.user_id, `Ваш заказ на вывод #${rows.id} на сумму ${rows.amount} USDT был отклонен`);
            });
        });
    } else {
        if (data.slice(0, 9) == 'continue_') {
            // CALCULATE PROFIT
            let prof;
            if (orders[msg.from.id]['amount'] < 300) {
                prof = 5;
            } else if (orders[msg.from.id]['amount'] < 1000) {
                prof = 7;
            } else {
                prof = 10;
            }
            new_contract(msg.from.id, orders[msg.from.id]['amount'], orders[msg.from.id]['length'] * 24, prof, orders[msg.from.id]['length']);
            bot.sendMessage(msg.from.id, generate_congrats_text(orders[msg.from.id]['amount']), main_menu_keyboard);
            set_stage(msg.from.id, "main_menu");
        } else {
            bot.sendMessage(msg.from.id, 'ОТМЕНЕНО', main_menu_keyboard);
            set_stage(msg.from.id, "main_menu");
        }
    }
});


