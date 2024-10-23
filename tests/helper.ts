import {Page, expect, Locator, test} from "@playwright/test";
import fileSystem from "fs";


export async function removeLastCharacter(filename) {
    const stat = await fileSystem.promises.stat(filename)
    const fileSize = stat.size

    await fileSystem.promises.truncate(filename, fileSize - 1)
}

export async function closePopupWithPromptingToCreateOldItem(page: Page) {
    await recursivelyWaitForElementWithoutErrorTimeout(page, 'wizard_cache_alert_clear', 3, 'Wait for popup new-old item creation');
    const btnClearUserAsFlag = await page.getByTestId('wizard_cache_alert_clear');
    let countOfBtnClearUserAsFlag = await btnClearUserAsFlag.count();
    console.log("Try to find alert dialog for renew item, buttons found:" + countOfBtnClearUserAsFlag);
    if (countOfBtnClearUserAsFlag > 0) {//подтверждаю создание нового элемента
        console.log('Alert dialog was found!');
        await btnClearUserAsFlag.click();
        await page.waitForLoadState('domcontentloaded');
    }
}

export async function loginIfNotAlreadyLogined(page: Page, domainToLogin: string) {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const urlNow = await page.url();
    if (urlNow.indexOf(domainToLogin + 'signin') != -1) {//возможно как маркер можно брать наличие инпута для логина
        expect(await page.locator("#register_username").count()).toBeGreaterThan(0);
        await page.locator("#register_username").fill(process.env.USER_EMAIL);
        expect(await page.locator("#register_password").count()).toBeGreaterThan(0);
        await page.locator("#register_password").fill(process.env.USER_PASSWORD);
        expect(await page.locator("button[type=submit]").count()).toBeGreaterThan(0);
        await page.locator("button[type=submit]").click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
    }
}

export async function recursivelyWaitUrlContainsString(page: Page, url: string, attempts: number, stringInfoAboutTest: string, step =1, timeout = 1000) {
    step++;
    console.log("Try to find if Url contains:" + url);
    const currentUrl = await page.url();
    console.log("current Url:" + currentUrl);
    if (currentUrl.indexOf(url) != -1) {
        console.log("I'm on url:" + currentUrl + " that contains literal:" + url + " Success!");
        return true;
    } else {
        //console.log("Attempt №" + step + " of:" + attempts + " fails!");
        await page.waitForTimeout(timeout);
        if (step < attempts) {
            await recursivelyWaitUrlContainsString(page, url, attempts, stringInfoAboutTest, step, timeout);
        } else {
            console.log("During " + attempts + "attempts with timeout:" + timeout + " not on URL that contains" + url + "!");
            return false;
        }
    }
}

export async function recursivelyWaitUrlNotContainsString(page: Page, url: string, attempts: number, stringInfoAboutTest: string, step =1, timeout = 1000) {
    step++;
    console.log("Try to find if Url contains:" + url);
    const currentUrl = await page.url();
    console.log("current Url:" + currentUrl);
    if (currentUrl.indexOf(url) == -1) {
        console.log("I'm on url:" + currentUrl + " that DO NOT contains literal:" + url + " Success!");
        return true;
    } else {
        //console.log("Attempt №" + step + " of:" + attempts + " fails!");
        await page.waitForTimeout(timeout);
        if (step < attempts) {
            await recursivelyWaitUrlContainsString(page, url, attempts, stringInfoAboutTest, step, timeout);
        } else {
            console.log("During " + attempts + "attempts with timeout:" + timeout + " still on URL that contains" + url + "!");
            return false;
        }
    }
}

export async function recursivelyWaitForTextInElementExist(page: Page, elementId, attempts: number, stringInfoAboutTest: string, locatorType = 'locator', step = 0, timeout = 1000) {
    step++;
    let element: Locator;
    let elementCount: number;
    let isElementAttached: boolean;
    let textLength = 0;
    const currentUrl = await page.url();
    console.log("[TEST]:" + stringInfoAboutTest)
    console.log("Checking URL:" + currentUrl);
    let message = stringInfoAboutTest + ' Pause to find TEXT in element:' + elementId + "; step №" + step + " attempts left:" + attempts + "; timeout:" + timeout + "ms; URL:" + currentUrl;
    await test.step(message, async () => {
        if (locatorType.indexOf('getByTestId') != -1) {
            element = await page.getByTestId(elementId);
        }
        else if (locatorType.indexOf('getByRole') != -1) {
            element = await page.getByRole(elementId);
        }
        else {
            element = await page.locator(elementId);
        }
        elementCount = await element.count();
        try{
            console.log("Time:" + new Date().toJSON().slice(0,19));
            await expect(element).toBeAttached({timeout: 2000});
            isElementAttached = true;
            // console.log("Element attached")
        }
        catch (Exception) {
            isElementAttached = false;
            // console.log("Element NOT attached")
        }
        let text = '';
        try {
            text = await element.textContent();
            console.log("[TEST]:" + stringInfoAboutTest + " In header with locator: " + elementId + " text is:" + text);
            textLength = text.length;
        }
        catch (Exception) {

        }
    }, { box: true });

    if (elementCount > 0 && isElementAttached && textLength > 0) {
        console.log("Element with ID:" + elementId + " found on step №" + step + " of:" + attempts + ". Element:");
        console.log(element);
        return true;
    } else {
        //console.log("Attempt №" + step + " of:" + attempts + " fails!");
        await page.waitForTimeout(timeout);
        if (step < attempts) {
            await recursivelyWaitForTextInElementExist(page, elementId, attempts, stringInfoAboutTest, locatorType, step, timeout);
        } else {
            console.log("Elements text with ID:" + elementId + " not found!")
            return false;
        }
    }
}

export async function recursivelyWaitForElementWithoutErrorTimeout(page: Page, elementId, attempts: number, stringInfoAboutTest: string, locatorType = 'locator', step = 0, timeout = 1000) {
    step++;
    let element: Locator;
    let elementCount: number;
    let isElementAttached: boolean;
    const currentUrl = await page.url();
    console.log("[TEST]:" + stringInfoAboutTest)
    console.log("Checking URL:" + currentUrl);
    let message = stringInfoAboutTest + ' Pause try to find element:' + elementId + "; step №" + step + " attempts:" + attempts + "; timeout:" + timeout + "ms; URL:" + currentUrl;
    await test.step(message, async () => {
        if (locatorType.indexOf('getByTestId') != -1) {
            element = await page.getByTestId(elementId);
        }
        else if (locatorType.indexOf('getByRole') != -1) {
            element = await page.getByRole(elementId);
        }
        else {
            element = await page.locator(elementId);
        }
        elementCount = await element.count();
        try{
            console.log("Time:" + new Date().toJSON().slice(0,19));
            await expect(element).toBeAttached({timeout: 2000});
            isElementAttached = true;
            // console.log("Element attached")
        }
        catch (Exception) {
            isElementAttached = false;
            // console.log("Element NOT attached")
        }
    }, { box: true });

    if (elementCount > 0 && isElementAttached) {
        console.log("Element with ID:" + elementId + " found on step №" + step + " of:" + attempts + ". Element:");
        console.log(element);
        return element;
    } else {
        //console.log("Attempt №" + step + " of:" + attempts + " fails!");
        await page.waitForTimeout(timeout);
        if (step < attempts) {
            await recursivelyWaitForElementWithoutErrorTimeout(page, elementId, attempts, stringInfoAboutTest, locatorType, step, timeout);
        } else {
            console.log("Element with ID:" + elementId + " not found!")
            return null;
        }
    }
}

export async function markStartTest(stringMsg, isLogOn = true) {
    await printCurrentTimeDate('Test ' + stringMsg + ' start time: ' + await formatDate(Date.now()), isLogOn);
}

export async function markEndTest(stringMsg, startDateTime, isLogOn = true) {
    let endDateTime = Date.now();
    const diffTime = Math.abs(endDateTime - startDateTime);
    const diffSecs = Math.floor(diffTime / (1000));
    await printCurrentTimeDate('Test ' + stringMsg + ' Start time: ' + await formatDate(startDateTime) + ' End time: ' + await formatDate(endDateTime) + ' Duration: ' + diffSecs + ' seconds', isLogOn);
}

export async function printCurrentTimeDate(msg, isLogOn) {
    if (isLogOn) {
        console.log(msg);
    }
    await test.step(msg, async () => {
        expect(true).toBe(true);
    });
}

const logFileName = '.logs/customLogger.txt';
export async function clearLogFile() {
    fileSystem.writeFileSync(logFileName, "");
}

export async function createDirIfNotExist(dirName: string) {
    if (!fileSystem.existsSync(dirName)){
        fileSystem.mkdirSync(dirName);
    }
}

export async function appendLogStringToFileAndConsole(filename: string, message: string, isConsoleLogOn = true) {
    const dateNow = await formatDate(Date.now(), '_');
    if (!fileSystem.existsSync(filename)) {
        fileSystem.writeFileSync(filename, "Logger file created\n");
    }
    if (isConsoleLogOn) {
        console.log(dateNow + " " + message);
    }
    fileSystem.appendFileSync(filename, message);
}

export async function formatDate(date, joinDateTimeChar = ' ', withMilliseconds = false, joinTimeChar = ':') {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear(),
        hour = '' + d.getHours(),
        minutes = '' + d.getMinutes(),
        seconds = '' + d.getSeconds();
    if (withMilliseconds) {
        var millis = d.getMilliseconds()
    }

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;
    if (hour.length < 2)
        hour = '0' + hour;
    if (minutes.length < 2)
        minutes = '0' + minutes;
    if (seconds.length < 2)
        seconds = '0' + seconds;

    let pureDate = [year, month, day].join('-');
    let pureTime;
    if (withMilliseconds) {
        pureTime = [hour, minutes, seconds, millis].join(joinTimeChar);
    } else {
        pureTime = [hour, minutes, seconds].join(joinTimeChar);
    }

    return [pureDate, pureTime].join(joinDateTimeChar);
}

export async function setPagination(page, number) {
    const paginationText = '' + number;
    const paginationContainer = await page.locator('ul[class="ant-pagination ant-table-pagination ant-table-pagination-right"]').nth(1);//@todo - заменить на data-testid
    const paginationOptions = await paginationContainer.locator('.ant-pagination-options');
    if (await paginationOptions.count() > 0) {
        await paginationOptions.click();
        const listOfPaginations = await paginationOptions.locator('div[class="ant-select-item ant-select-item-option"]')
        for (let i = 0; i < await listOfPaginations.count(); i++) {
            let infoMessage = 'Pagination text found:' + await listOfPaginations.nth(i).textContent() + ' Compare result:' + (await listOfPaginations.nth(i).textContent()).indexOf(paginationText);
            console.log(infoMessage);
            await test.step(infoMessage, async () => {
                await expect(true).toBeTruthy();
            });
            if ((await listOfPaginations.nth(i).textContent()).indexOf(paginationText) != -1) {
                await listOfPaginations.nth(i).click();//click if it is 100
            }
        }
        await test.step('Pagination was set to ' + paginationText, async () => {
            await expect(true).toBeTruthy();
        });
    } else {
        await test.step('Pagination was not found', async () => {
            await expect(true).toBeTruthy();
        });
    }

    await page.waitForLoadState('domcontentloaded');
}

export async function checkAndCloseCkeditorUpdateNotify(page) {
     // Блок проверки сообщения что у Ckeditor обновы
     const divCkeditorWarning = await page.locator('div.cke_notification cke_notification_warning');
     if (await divCkeditorWarning.count() > 0 && await divCkeditorWarning.isVisible()) {
         await divCkeditorWarning.locator('a.cke_notification_close').click();
     }
}

export async function deleteClientByEmail(page, email) {
    await page.goto('https://epple.dms.demo.symfio.de/dashboard/clients');

    await page.getByTestId('grid_search_input').click();
    await page.getByTestId('grid_search_input').fill(email);
    await page.waitForTimeout(3000);

    const threeDottedButton = await page.getByTestId('three_dotted_button');
    if (await threeDottedButton.count() > 0) {
        const countOfSearchResults = await threeDottedButton.count();
        for (let i = 0; i < countOfSearchResults; i++) {
            await threeDottedButton.nth(i).click();
            await page.waitForTimeout(500);
            await page.getByTestId('item-grid.action.delete').click();
            await page.getByRole('button', { name: 'OK' }).click();
        }
    }
}

export async function goToWorkingPage(page: Page, workingUrl: string, width = 1500, height = 900) {
    await page.goto(workingUrl);
    await test.step("Set Viewport Size 1500х900", async () => {
        await page.setViewportSize({ width: width, height: height });
    });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
}

export async function sendRequest(request, typeOfRequest, url, requestBodyData, token = '', origin, referer) {
    let result;
    let headers;
    if (token.length === 0){
        headers = {
            'Origin': origin,
            'Referer': referer,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate, br'
        };
    } else {
        headers = {
            'Origin': origin,
            'Referer': referer,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate, br',
            'Authorization': 'Bearer ' + token
        }
    }

    await test.step("send post to url:" + url, async () => {
        if(typeOfRequest === 'post'){
            result = await request.post(url, {
                headers: headers,
                data: requestBodyData,
            });
        } else if (typeOfRequest === 'get') {
            result = await request.get(url, {
                headers: headers,
                data: requestBodyData,
            });
        }

        expect(result.ok()).toBeTruthy();
        expect(result.status()).toBe(200);
    });
    return result;
}


export async function sendPostRequest(test, request, url, requestBodyData, headers) {
    let result;
    await test.step("send post to url:" + url, async () => {
        result = await request.post(url, {
            headers: headers,
            data: requestBodyData,
        });

        expect(result.ok()).toBeTruthy();
        expect(result.status()).toBe(200);
    });
    return result;
}
export async function sendGetRequest(test, request, url, requestBodyData, headers) {
    let result;
    await test.step("send get to url:" + url, async () => {
        result = await request.get(url, {
            headers: headers,
            data: requestBodyData,
        });

        expect(result.ok()).toBeTruthy();
        expect(result.status()).toBe(200);
    });
    return result;
}