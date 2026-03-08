const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const input = require("input");
const chalk = require("chalk");
const figlet = require("figlet");

chromium.use(stealth);

// --- KONFIGURASI ---
const apiId = 29781545; 
const apiHash = "1690ea64aff7789eaac73295cf6d94bf";
const stringSession = new StringSession(""); 
const targetBotId = "1340397690"; 
const myChatId = "ME";

(async () => {
    // Tampilan Awal: Banner ASCII
    console.clear();
    console.log(chalk.cyan(figlet.textSync('GMAIL WORKER', { horizontalLayout: 'full' })));
    console.log(chalk.yellow("==============================================="));
    console.log(chalk.green(" Ready to Farm? Let's get that bread! 🚀"));
    console.log(chalk.yellow("==============================================="));

    const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

    await client.start({
        phoneNumber: async () => {
            const num = await input.text(chalk.blue("📞 Masukkan Nomor HP (International Format): "));
            console.clear(); // Clear setelah input nomor
            return num;
        },
        phoneCode: async () => {
            console.log(chalk.cyan(figlet.textSync('OTP REQUIRED', { font: 'Small' })));
            const otp = await input.text(chalk.magenta("🔑 Masukkan Kode OTP dari Telegram: "));
            console.clear(); // Clear setelah input OTP
            return otp;
        },
        onError: (err) => console.log(chalk.red("❌ Error: " + err)),
    });

    console.log(chalk.green("✅ Autentikasi Berhasil! Bot sedang standby..."));
    console.log(chalk.gray("-----------------------------------------------"));

    // Fungsi Klik Tombol Bot
    async function clickBotButton(buttonText) {
        try {
            const messages = await client.getMessages(targetBotId, { limit: 1 });
            if (messages.length > 0 && messages[0].replyMarkup) {
                const rows = messages[0].replyMarkup.rows;
                for (const row of rows) {
                    const button = row.buttons.find(b => b.text.includes(buttonText));
                    if (button) {
                        console.log(chalk.blue(`🖱️  Klik Button: [${buttonText}]`));
                        await client.invoke(new Api.messages.GetBotCallbackAnswer({
                            peer: targetBotId,
                            msgId: messages[0].id,
                            data: button.data
                        }));
                        return true;
                    }
                }
            }
        } catch (e) { console.log(chalk.red(`❌ Gagal klik ${buttonText}: ` + e.message)); }
        return false;
    }

    // Listener Pesan
    client.addEventHandler(async (event) => {
        const message = event.message;
        if (message.peerId && message.peerId.userId.toString() === targetBotId) {
            const text = message.message;

            if (text.includes("First name:")) {
                const data = parseGmailFarmer(text);
                if (data) {
                    console.log(chalk.yellow(`\n📦 DATA DITERIMA: ${data.email}`));
                    const success = await runAutomation(data);
                    
                    if (success) {
                        await client.sendMessage(myChatId, { 
                            message: `✅ **SUKSES**\n📧 \`${data.email}@gmail.com\`\n🔑 \`${data.password}\`` 
                        });

                        console.log(chalk.green("🎉 Akun Berhasil! Mengirim laporan..."));
                        await sleep(3000);
                        await clickBotButton("Done");
                        await sleep(3000);
                        await clickBotButton("Complete");

                        console.log(chalk.gray("⏳ Menunggu 2 menit sebelum ambil job baru..."));
                        await sleep(120000); 
                        await clickBotButton("Register");
                    }
                }
            }
        }
    }, new NewMessage({}));

    // Fungsi Automasi Browser
    async function runAutomation(data) {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            console.log(chalk.white(`🛠️  Mengisi form Google untuk: `) + chalk.cyan(data.email));
            await page.goto('https://accounts.google.com/signup');
            
            await page.fill('#firstName', data.firstName);
            if (data.lastName !== "✖️") await page.fill('#lastName', data.lastName);
            await page.click('#collectNameNext');

            await page.waitForTimeout(2000);
            await page.fill('#day', '15');
            await page.selectOption('#month', '6');
            await page.fill('#year', '1997');
            await page.selectOption('#gender', '1');
            await page.click('#birthdaygenderNext');

            await page.waitForSelector('input[name="Username"]');
            await page.fill('input[name="Username"]', data.email);
            await page.click('#next');

            await page.waitForSelector('input[name="Passwd"]');
            await page.fill('input[name="Passwd"]', data.password);
            await page.fill('input[name="PasswdAgain"]', data.password);
            await page.click('#next');

            console.log(chalk.magenta("👉 SILAKAN VERIFIKASI SMS DI BROWSER!"));
            await page.waitForURL('**/myaccount.google.com/**', { timeout: 300000 });
            
            await browser.close();
            return true;
        } catch (err) {
            console.log(chalk.red("❌ Browser Close/Error."));
            await browser.close();
            return false;
        }
    }

    function parseGmailFarmer(text) {
        try {
            const firstName = text.match(/First name: (.+)/)[1].trim();
            const lastName = text.match(/Last name: (.+)/)[1].trim();
            const email = text.match(/Email: (.+)@gmail\.com/)[1].trim();
            const password = text.match(/Password: (.+)/)[1].trim();
            return { firstName, lastName, email, password };
        } catch (e) { return null; }
    }

    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    await clickBotButton("Register");
})();