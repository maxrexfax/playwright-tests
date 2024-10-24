import {APIRequestContext, expect, Page, test} from "@playwright/test";
import fileSystem from "fs";
import Ajv from 'ajv';

import {
    appendLogStringToFileAndConsole, createDirIfNotExist,
    formatDate,
    markEndTest,
    markStartTest, removeLastCharacter, sendGetRequest, sendRequest
} from "./helper";

// const TemporaryBearerToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0eXBlIjoiYmFja2VuZF9hcGlfdjIiLCJzYWx0IjoiNjcxNjJhMTk0N2U2ZjMuMzI4NjkzMzkiLCJleHAiOjE3MzIxODc4MTcsInVzZXJfaWQiOiI2NzE2MDQ3YTc0M2I4OGM4NzgwZDkxMGUiLCJzaXRlX2lkIjoiNjNlNGI1ZWJlZGMzZTQ0MmEzMDhiZWUyIiwicm9sZXMiOlsiUk9MRV9BRE1JTiJdfQ.bRenCZv3vXXAhiEumHqpgl1G6R2ST0aGrH5mKRmEyS8';


let page: Page;
let token: string;
let frontendApiTotal: number;
let dashboardVehiclesTotal: number;
let frontendApiTotalNew: number;
let dashboardVehiclesTotalNew: number;
let arrayOfErrors = [];
let logFileForPriceErrors = './logs/logFileForPriceErrors.json';
let errorsInArrayCount = 0;

test.describe("Perform group of tests for:" + process.env.SITE_NAME, () => {
    const ajv = new Ajv();

    test.beforeAll("Inside block before all try to get auth token", async ({ browser }) => {
       // ниже 4 строки моя попытка читать параметры командной строки. пока видит только node.exe и process.js
        // process.argv.forEach(function (val, index, array) {
        //     console.log(index + ': ' + val);
        //     console.log('array:', array);
        // });
        console.log('Before tests');
        await createDirIfNotExist('./logs');
        fileSystem.writeFileSync(logFileForPriceErrors, "{\n\t\"start time\":\"" + await formatDate(Date.now()) + "\",");
        page = await browser.newPage();
        await test.step("Try to get bearer token", async () => {
            const requestBodyLoginData = {
                'username': process.env.USER_EMAIL,
                'password': process.env.USER_PASSWORD,
                'customer_id': process.env.USER_CUSTOMER_ID,
            }
            // console.log('requestBodyLoginData:', requestBodyLoginData)
            let urlToGetToken = 'https://api.live.symfio.de/api/v2/backend/login';
            // const responseV2 = await sendPostRequest(page.request, urlToGetToken, requestBodyLoginData);
            const responseV2 = await sendRequest(page.request, 'post', urlToGetToken, requestBodyLoginData, '', process.env.SITE_HEADERS_ORIGIN, process.env.SITE_HEADERS_REFERER);
            const responseBodyV2 = await responseV2.json();
            token = responseBodyV2['data']['token'];
        });
    });

    test.skip('Test ' + process.env.SITE_NAME + ' api V1 vs V2 total result values', async ({request}) => {
        let startDateTime;
        await test.step("Start test - try to get value of total parameter for frontend", async () => {
            startDateTime = Date.now();
            await markStartTest('Test ' + process.env.SITE_NAME + ' api V1 vs V2');
            const urlToFrontendApi = 'https://backend.symfio.de/frontend/api/frontend/v1/vehicles?domain=' + process.env.SITE_NAME;
            const responseV1 = await sendRequest(request, 'get', urlToFrontendApi, {}, '', process.env.SITE_HEADERS_ORIGIN, process.env.SITE_HEADERS_REFERER);
            const responseBodyV1 = await responseV1.json();
            frontendApiTotal = responseBodyV1['info']['total'];
            console.log("frontendApiTotal:" + frontendApiTotal);
        });
        await test.step("Frontend total is:" + frontendApiTotal, async () => {
            expect(frontendApiTotal > 0).toBeTruthy();
        });

        expect(token).toBeDefined();
        await test.step("Try to get list of vehicles for dashboard", async () => {
            const urlToGetListVehiclesForDashboard = 'https://api.live.symfio.de/en/api/v2/backend/vehicles';
            const requestBodyData = {
                'filters': {'status': 'Inventory'}
            }
            // const gotResponseDashboardVehicles = await sendPostRequest(request, urlToGetListVehiclesForDashboard, requestBodyData);
            const gotResponseDashboardVehicles = await sendRequest(request, 'post', urlToGetListVehiclesForDashboard, requestBodyData, token, process.env.SITE_HEADERS_ORIGIN, process.env.SITE_HEADERS_REFERER);
            console.log("gotResponseDashboardVehicles:" + gotResponseDashboardVehicles);
            const responseBodyVehicles = await gotResponseDashboardVehicles.json();
            // let resultLength = responseBodyVehicles['data'].length;
            dashboardVehiclesTotal = responseBodyVehicles['info']['total'];
        });
        await test.step("Dashboard total is:" + dashboardVehiclesTotal, async () => {
            expect(dashboardVehiclesTotal > 0).toBeTruthy();
        });

        await test.step("Final compare of vehicles total in frontend api(" + frontendApiTotal + ") and dashboard" + dashboardVehiclesTotal, async () => {
            expect(frontendApiTotal === dashboardVehiclesTotal).toBeTruthy();
        });
        console.log("Vehicles total for frontend:" + frontendApiTotal + "  dashboard total:" + dashboardVehiclesTotal);

        await markEndTest('Test comparison of API v1 vs v2 ends', startDateTime);
    });

    test.skip('Test ' + process.env.SITE_NAME + ' api V2 vehicle forbidden settings', async ({ request }) => {
        test.setTimeout(480 * 1000);
        let startDateTime = Date.now();
        await markStartTest('Test ' + process.env.SITE_NAME + ' api V1 vs V2');
        expect(token).toBeDefined();
        let isVehiclesExist = true;
        let pageNumber = 1;
        const urlToGetListVehiclesForDashboard = 'https://api.live.symfio.de/en/api/v2/backend/vehicles';
        let stepErrors = [];
        while (isVehiclesExist) {
            const requestBodyData = {
                'filters': {'status': 'Inventory'/*, "title":["New"]*/},
                "pageSize":50,
                "page":pageNumber,
            }
            pageNumber++;
            const gotResponseDashboardVehicles = await sendRequest(request, 'post', urlToGetListVehiclesForDashboard, requestBodyData, token, process.env.SITE_HEADERS_ORIGIN, process.env.SITE_HEADERS_REFERER);
            const responseBodyVehicles = await gotResponseDashboardVehicles.json();
            if (undefined === dashboardVehiclesTotalNew) {
                dashboardVehiclesTotalNew = responseBodyVehicles['info']['total'];
            }
            let listOfVehicles = responseBodyVehicles['data'];
            if (listOfVehicles.length > 0) {
                stepErrors = await checkAllVehiclesFromAnswer(listOfVehicles);
            } else {
                isVehiclesExist = false;
            }
            if(stepErrors.length > 0) {
                console.log('stepErrors:', stepErrors);
                arrayOfErrors = arrayOfErrors.concat(stepErrors);
                stepErrors = [];
            }
        }
        console.log('arrayOfErrors:', arrayOfErrors);
        errorsInArrayCount = Object.keys(arrayOfErrors).length;
        console.log('errorsInArrayCount:', errorsInArrayCount);
        if (errorsInArrayCount > 0) {
            await appendLogStringToFileAndConsole(logFileForPriceErrors, "\n\t\"errors found\":\"" + errorsInArrayCount + "\",", false);
            let stringErrors = '';
            for (const [vehicleId, errorData] of Object.entries(arrayOfErrors)) {
                stringErrors += vehicleId + ':' + errorData + ';';
            }
            await test.step("Errors found:" + arrayOfErrors.length, async () => {
                await test.step("Errors list:" + stringErrors, async () => {
                    expect(errorsInArrayCount < 1).toBeTruthy();
                });
            });
        } else {
            await appendLogStringToFileAndConsole(logFileForPriceErrors, "\n\t\"errors found\":\"0\",", false);
            await test.step("No errors found", async () => {
                expect(arrayOfErrors.length < 1).toBeTruthy();
                console.log("No errors found");
            });
        }
        await markEndTest('Test comparison of API v1 vs v2 ends', startDateTime);
    });

    test('Test ' + process.env.SITE_NAME + ' api V1 vs V2 returns equal last createdAt vehicles', async ({request}) => {
        let startDateTime;
        let dashboardStocks;
        await test.step("Start test - get list of last created vehicles for dashboard", async () => {
            startDateTime = Date.now();
            await markStartTest('Test ' + process.env.SITE_NAME + ' get list of last created vehicles for dashboard');
            const requestBodyData = {
                'filters': {'status': 'Inventory', 'title':'New'},
                "sortBy":"createdAt",
                "order":"descend",
                "pageSize": 12
            }
            const urlToGetListVehiclesForDashboard = 'https://api.live.symfio.de/en/api/v2/backend/vehicles';
            const gotResponseDashboardVehicles = await sendRequest(request, 'post', urlToGetListVehiclesForDashboard, requestBodyData, token, process.env.SITE_HEADERS_ORIGIN, process.env.SITE_HEADERS_REFERER);
            const responseBodyDashboardVehicles = await gotResponseDashboardVehicles.json();
            const dataDashboardVehicles = responseBodyDashboardVehicles['data'];
            // const dashboardIds = dataDashboardVehicles.map(function (vehicle) {
            //     return vehicle.id;
            // });
            const dashboardIds = dataDashboardVehicles.map(({ id }) => id);
            dashboardIds.sort();
            dashboardStocks = dataDashboardVehicles.map(({ stock }) => stock);
            dashboardStocks.sort();
            //console.log("dashboardIds:", dashboardIds);
            //console.log("dashboardStocks:", dashboardStocks);
        });
        let frontendStocks;
        await test.step("Get list of last created vehicles for frontend", async () => {
            // const urlToFrontendApi = 'https://backend.symfio.de/frontend/api/frontend/v1/vehicles?limit=10&title=New&domain=' + process.env.SITE_NAME;
            // const urlToFrontendApi = 'https://gabelstapler-zentrum.de/api/vehicles?title=New&sort_by=last_added&sort_order=desc&limit=12&domain=' + process.env.SITE_NAME;
            const urlToFrontendApi = 'https://backend.symfio.de/frontend/api/frontend/v1/vehicles?title=New&sort_by=last_added&sort_order=desc&limit=12&domain=' + process.env.SITE_NAME;

            const responseV1 = await sendRequest(request, 'get', urlToFrontendApi, {}, '', '', '');
            // const responseV1 = await sendGetRequest(test, request, urlToFrontendApi, 'get', headers);
            const responseBodyV1 = await responseV1.json();
            const dataFrontendVehicles = responseBodyV1['data'];
            const frontendIds = dataFrontendVehicles.map(({id}) => id);
            frontendIds.sort();
            frontendStocks = dataFrontendVehicles.map(({stock}) => stock);
            frontendStocks.sort();
        });

        await test.step("Compare list for frontend and dashboard", async () => {
            expect(await compareArrays(frontendStocks, dashboardStocks)).toBeTruthy();
        });

        await markEndTest('Test ' + process.env.SITE_NAME + ' get list of last created vehicles for dashboard', startDateTime);
    });


    test.skip('Test ' + process.env.SITE_NAME + ' dashboard api for pages', async ({request}) => {
        const urlToGetListPagesForDashboard = 'https://backend.symfio.de/frontend/api/frontend/v1/pages?domain=gabelstapler-zentrum.de';
        const gotResponseFrontendPages = await sendGetRequest(test, request,  urlToGetListPagesForDashboard, {}, {});
        const responseBodyFrontendPages = await gotResponseFrontendPages.json();
        const listOfPages = responseBodyFrontendPages['data'];
        let frontendPagesIds = listOfPages.map(({id}) => id);
        frontendPagesIds.sort();
        // // console.log("pagesIds:", pagesIds);
        let pageNumber = 1;
        let isResultExist = true;
        const urlToGetPagesListForDashboard = 'https://api.live.symfio.de/en/api/v2/backend/pages';
        let listOfDashboardPagesIds = [];
        while (isResultExist) {
            const requestBodyData = {
                'filters': {'is_mobile	': 'no'},
                "pageSize":50,
                "page":pageNumber,
            }
            pageNumber++;
            const gotResponseDashboardPages = await sendRequest(request, 'post', urlToGetPagesListForDashboard, requestBodyData, token, process.env.SITE_HEADERS_ORIGIN, process.env.SITE_HEADERS_REFERER);
            const responseBodyDashboardPages = await gotResponseDashboardPages.json();
            let listOfDashboardPages = responseBodyDashboardPages['data'];
            if (listOfDashboardPages.length > 0) {
                let tmpPagesIds = listOfDashboardPages.map(({id}) => id);
                listOfDashboardPagesIds = listOfDashboardPagesIds.concat(tmpPagesIds);
            } else {
                isResultExist = false;
            }
        }

        listOfDashboardPagesIds.sort();
        // console.log("frontendPagesIds:", frontendPagesIds);
        // console.log("listOfDashboardPagesIds:", listOfDashboardPagesIds);
        console.log("frontendPagesIds.length:", frontendPagesIds.length);
        console.log("listOfDashboardPagesIds.length:", listOfDashboardPagesIds.length);
        await test.step("Compare list of IDs for frontend and dashboard PAGES", async () => {
            console.log("frontendPagesIds == listOfDashboardPagesIds:", frontendPagesIds == listOfDashboardPagesIds);
            //expect(frontendPagesIds == listOfDashboardPagesIds).toBeTruthy();
        });
        // Below example JSON structure match rules check
        // const valid = ajv.validate(require('../jsonRules/pageInGrid.schema.json'), dataDashboardPages);
        // // Output the errors text
        // if (!valid) {
        //     console.log('AJV Validation Errors:', ajv.errorsText());
        // }
        // expect(valid).toBe(true);
    });

    test.afterAll("Close log file", async ({ browser }) => {
        await appendLogStringToFileAndConsole(logFileForPriceErrors, "\n\t\"end time\":\"" + await formatDate(Date.now()) + "\"\n}", false);
    });
});

// async function printData(frontendStocks, dashboardStocks)
// {
//     for (let i = 0; i < frontendStocks.length; i++){
//         console.log("f: " + frontendStocks[i] + " d: " + dashboardStocks[i]);
//         console.log(frontendStocks[i] === dashboardStocks[i]);
//     }
// }
async function compareArrays(frontendStocks, dashboardStocks)
{
    if (!frontendStocks || !dashboardStocks)
        return false;
    // if the argument is the same array, we can be sure the contents are same as well
    if(frontendStocks === dashboardStocks)
        return true;
    // compare lengths - can save a lot of time
    if (frontendStocks.length != dashboardStocks.length)
        return false;

    for (var i = 0, l=frontendStocks.length; i < l; i++) {
        // Check if we have nested arrays
        if (frontendStocks[i] instanceof Array && dashboardStocks[i] instanceof Array) {
            // recurse into the nested arrays
            if (!frontendStocks[i].equals(dashboardStocks[i]))
                return false;
        }
        else if (frontendStocks[i] != dashboardStocks[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}

//if isNew === 1 то цена видна (show_price===1) и цена не равна 0. isNew===0 то show_price ДОЛЖЕН быть равен 0 OR цена === 0
async function checkAllVehiclesFromAnswer(listOfVehicles: any) {
    for (const [key, vehicleData] of Object.entries(listOfVehicles)) {
        // console.log("Now check vehicle with ID:" + vehicleData['id']);
        await test.step("Now check vehicle with ID:" + vehicleData['id'], async () => {
            let tmpErrors = [];
            // let message = '';
            if (vehicleData['price']['show_price_dealer'] === true || vehicleData['price']['show_price_dealer'] === 1) {
                tmpErrors.push({'show_price_dealer' : 'show_price_dealer set TRUE; but must be FALSE'});
            }
            if (vehicleData['price']['show_producer_price'] === true && vehicleData['price']['show_producer_price'] === 1) {
                tmpErrors.push({'show_producer_price' : 'show_producer_price set to TRUE; but must be FALSE'});
            }
            if (vehicleData['isNew'] === 1) {
                if (vehicleData['price']['show_price'] === 0) {
                    tmpErrors.push({'error': 'show_price', 'message' : 'isNew==1, but show_price==0; show_price must be 1'});
                } else {//show_price===1, price не должна  быть равна 0
                    if (vehicleData['price']['notax'] === 0) {
                        tmpErrors.push({'error': 'price', 'message' : 'isNew==1, show_price==1 but price notax==0; price must NOT be 0'});
                    }
                    if (vehicleData['price']['current'] === 0) {
                        tmpErrors.push({'error': 'price', 'message' : 'isNew==1, show_price==1 but price current==0; price must NOT be 0'});
                    }
                }
            } else {//isNew === 0
                if (vehicleData['price']['show_price'] === 1) {
                    if (vehicleData['price']['current'] > 0) {
                        tmpErrors.push({'error': 'price', 'message' : 'isNew==0, show_price==1, price current > 0; price current must be 0'});
                    }
                    if (vehicleData['price']['notax'] > 0) {
                        tmpErrors.push({'error': 'price', 'message' : 'isNew==0, show_price==1, price notax > 0; price notax must be 0'});
                    }
                }
            }
            if (tmpErrors.length > 0) {
                arrayOfErrors[vehicleData['id']] = [];
                arrayOfErrors[vehicleData['id']].push({tmpErrors});
                let dataToLog = "\n\t\"" + vehicleData['id'] + "\": {\n\t\t\"errors\": [";
                for (const [key, errorData] of Object.entries(tmpErrors)) {
                    dataToLog += '\n\t\t\t{ "Field": "' + errorData['error'] + '", "message": "' + errorData['message'] + '"},';
                }
                dataToLog = dataToLog.substring(0, dataToLog.length - 1);
                dataToLog += '\n\t\t]\n\t},';
                await appendLogStringToFileAndConsole(logFileForPriceErrors, dataToLog, false);
            }
        });
    }
    //await removeLastCharacter(logFileForPriceErrors);
    return arrayOfErrors;
}

