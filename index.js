const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./databases/database.db');


db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (user_id INTEGER, balance REAL, admin INTEGER, position TEXT, banned INTEGER)");
});


const token = '5173499293:AAEjTu3z7N-6rhpJxHhhDPV_gR85hlTc-LA';
const bot = new TelegramBot(token, {polling: true});



const freedom_link = 'https://freedom24.com/authentication/signup/?__lang__=ru&ref=mc_gc_general_f24_ru_17066694396&utm_campaign=mc_gc_general_f24_ru_17066694396_135610020469&utm_source=google&utm_medium=search&utm_term=m_freedom24&utm_content=135610020469_598492474497&gclid=Cj0KCQiA5NSdBhDfARIsALzs2EBmHEj9xFozw0IAkP9kwgxZ6PO3CnegYB38NqtmQK2paa5Lk-ktbMUaAqLiEALw_wcB';


const admin_id = 532666364;
let orders = {};

function new_user(chatId) {
    db.serialize(() => {
        db.get('SELECT * FROM users WHERE user_id = ?', [chatId], (err, result) => {
            if (err) {
                console.log(err);
            } else {
                console.log(result);
                if (result == undefined) {
                    const stmt = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)");
                    stmt.run(chatId, 0, 0, "main_menu", 0);
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




function set_stage(chatId, stage_name) {
    db.serialize(() => {
        const stmt = db.prepare("UPDATE users SET position = ? WHERE user_id = ?");
        stmt.run(stage_name, chatId);
        stmt.finalize();
        console.log('UPDATED POSITION');
    });
}



let main_menu_keyboard = {
    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: false, // TRUE
        keyboard: [
            ["Пополнить Баланс", "Вывести средства"],
            ["📝 Контракт и Условия 📝"],
            ["🆘 Служба поддержки ( администратор ) 🆘"],
            ["📈 FREEDOM 24 📉"],
            ["🥇 МОЙ ПРОФИЛЬ 🥇"]
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
            ["Отмена"]
        ]
    }
}


bot_works_3_yrs = `✅НАШ БОТ РАБОТАЕТ УЖЕ БОЛЕЕ 3-ёх ЛЕТ ✅
📌Мы зарабатываем за счет ваших инвестиций 📌
❗️Каждый участник нашего бота получает 5% с суммы его депозита ( один раз в 24 часа ) ❗️
💻 Мы инвестируем финансы в Брокерскую компанию FREEDOM 24 💻`

adresses_text = `BNB Адрес для пополнения📌
0x301cb894142810bed99c3251209b
8bd9a8b2f
Сеть
BNB Smart Chain (BEP20)

USDT Адрес для пополнения📌
TPWuXaPy4xZwPbrQuazodp08zKX81
4Y4F
7
Сеть
Tron (TRC20)

ETH Адрес для пополнения📌
0x301cb894142810bed99c3251209b
8bd9a8b2f
Сеть
Ethereum (ERC20)

ВТС Адрес для пополнения📌
1DNN8efMUXj4KJgi5xnRXP57yAPex3D
TiB
Сеть
Bitcoin`


send_check_text = `‼️ Важно ‼️
После того как вы отправили средства пришлите чек о переводе нашему администратору 

               👇
@investadmincrypto`


write_to_withdraw = `Напишите нашему администратору , на какой Адрес и сеть кошелька вы желаете вывести свой депозит 

👇
@investadmincrypto`


bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const username = msg.chat.username;
    const text = msg.text;

    if (text.includes('/start')) {
        new_user(chatId);

        bot.sendMessage(chatId, 'Поздравляем! Вы подписались на cryptoinvestbot.', main_menu_keyboard);
        return;
    }

    get_user(chatId).then(results => {
        if (!results) {
            new_user(chatId);
        }
        if (text == "Отмена") {
            set_stage(chatId, "main_menu");
    
            bot.sendMessage(chatId, 'Отменено.', main_menu_keyboard);
        } else if (text == '📝 Контракт и Условия 📝') {
            bot.sendMessage(chatId, bot_works_3_yrs, cancel_keyboard);
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
                bot.sendMessage(chatId, freedom_link, main_menu_keyboard);
                set_stage(chatId, "main_menu");
            }
        } else if (text == '🥇 МОЙ ПРОФИЛЬ 🥇') {
            set_stage(chatId, "profile");
            bot.sendMessage(chatId, '✏️', {
                reply_markup: {
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    keyboard: [
                        ["⚖️ МОЙ БАЛАНС ⚖️"],
                        ["🪫 МОЯ ПРИБЫЛЬ 🔋"],
                        ["Отмена"]
                    ]
                }
            });
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
            // TO DO: SAVE CHOISE HERE
            orders[username] = {'ammount': text};
            set_stage(chatId, "fill_up_nets");
            bot.sendMessage(chatId, `Выберете вариант который для вас более УДОБНЫЙ :`, nets_keyboard);
        } else if (results.position == 'fill_up_nets') {
            orders[username]['net'] = text;
            bot.sendMessage(admin_id, `Новый заказ в ожидании\n@${username}\n${orders[username]['ammount']}\n${orders[username]['net']}`);

            set_stage(chatId, "main_menu");
            bot.sendMessage(chatId, adresses_text).then(() => {     // IF MESSAGE WITH CHECKS SENDS BEFORE I NEED
                bot.sendMessage(chatId, send_check_text, main_menu_keyboard);
            });
        } else if (text == 'Вывести средства') {
            set_stage(chatId, "withdraw");
            bot.sendMessage(chatId, `Вывести средства`, nets_keyboard);
        } else if (results.position == 'withdraw') {
            // TO DO: SAVE CHOISE HERE
            set_stage(chatId, "withdraw_amount");
            bot.sendMessage(chatId, `Какую сумму вы желаете вывести на свой Кошелек ?`, amount_keyboard);
        } else if (results.position == 'withdraw_amount') {
            set_stage(chatId, "main_menu");
            bot.sendMessage(chatId, write_to_withdraw, main_menu_keyboard);
        }
    });



    // bot.sendMessage(chatId, text);
});
