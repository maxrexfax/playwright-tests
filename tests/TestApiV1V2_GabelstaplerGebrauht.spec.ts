import {expect, test} from "@playwright/test";

import {markEndTest, markStartTest} from "./helper";

const TemporaryBearerToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0eXBlIjoiYmFja2VuZF9hcGlfdjIiLCJzYWx0IjoiNjcxNjJhMTk0N2U2ZjMuMzI4NjkzMzkiLCJleHAiOjE3MzIxODc4MTcsInVzZXJfaWQiOiI2NzE2MDQ3YTc0M2I4OGM4NzgwZDkxMGUiLCJzaXRlX2lkIjoiNjNlNGI1ZWJlZGMzZTQ0MmEzMDhiZWUyIiwicm9sZXMiOlsiUk9MRV9BRE1JTiJdfQ.bRenCZv3vXXAhiEumHqpgl1G6R2ST0aGrH5mKRmEyS8';


let token: string;
let frontendApiTotal: number;
let dashboardVehiclesTotal: number;
// let frontendApiTotalNew: number;
// let dashboardVehiclesTotalNew: number;

test.describe("Perform group of tests for gabelstapler-gebraucht.at", () => {

    test.skip('Test gabelstapler-gebraucht.at api V1 vs V2', async ({ request, page }) => {
        let startDateTime;
        await test.step("Start test - try to get value of total parameter for frontend", async () => {
            startDateTime = Date.now();
            await markStartTest('Test comparison of API v1 vs v2 starts');
            const urlToFrontendApi = 'https://backend.symfio.de/frontend/api/frontend/v1/vehicles?domain=gabelstapler-gebraucht.at';
            const responseV1 = await request.get(urlToFrontendApi, {});
            expect(responseV1.ok()).toBeTruthy();
            expect(responseV1.status()).toBe(200);
            const responseBodyV1 = await responseV1.json();
            frontendApiTotal = responseBodyV1['info']['total'];
            console.log("frontendApiTotal:" + frontendApiTotal);
        });
        await test.step("Frontend total is:" + frontendApiTotal, async () => {
            expect(frontendApiTotal > 0).toBeTruthy();
        });

        await test.step("Try to get bearer token", async () => {
            const requestBodyLoginData = {
                'username': process.env.USER_EMAIL,
                'password': process.env.USER_PASSWORD,
                'customer_id': 'gsz',
            }
            // console.log('requestBodyLoginData:', requestBodyLoginData)
            let urlToGetToken = 'https://api.live.symfio.de/api/v2/backend/login';
            const responseV2 = await request.post(urlToGetToken, {
                headers: {
                    'Origin' : 'https://gsz.dms.symfio.de',
                    'Referer' : 'https://gsz.dms.symfio.de',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate, br'
                },
                data: requestBodyLoginData
            });
            expect(responseV2.ok()).toBeTruthy();
            expect(responseV2.status()).toBe(200);
            const responseBodyV2 = await responseV2.json();
            token = responseBodyV2['data']['token'];
        });

        await test.step("Try to get list of vehicles for dashboard", async () => {
            const urlToGetListVehiclesForDashboard = 'https://api.live.symfio.de/en/api/v2/backend/vehicles';
            const requestBodyData = {
                'filters': {'status': 'Inventory'}
            }
            const gotResponseDashboardVehicles = await request.post(urlToGetListVehiclesForDashboard, {
                headers: {
                    'Origin' : 'https://gsz.dms.symfio.de',
                    'Referer' : 'https://gsz.dms.symfio.de',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Authorization': 'Bearer ' + token,
                },
                data: requestBodyData,
            });
            expect(gotResponseDashboardVehicles.ok()).toBeTruthy();
            expect(gotResponseDashboardVehicles.status()).toBe(200);
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
// в админке надо следить чтобы цена была выключена/или==0 от дилера и закупка и производителя, также у ИНВЕНТОРИ не title new
    // title NEW+status INVENTORY - цена ПРОДАЖИ видна, цена продажи _notax - без таксы-налога НЕ ВИДНА
    // на фронтенде надо смотреть чтобы цена была 0 или выключена вся кроме title NEW+status INVENTORY - цена ПРОДАЖИ видна
    test('Test gabelstapler-gebraucht.at api V2 hidden prices', async ({ request, page }) => {
        let isVehiclesExist = true;
        let pageNumber = 1;
        const urlToGetListVehiclesForDashboard = 'https://api.live.symfio.de/en/api/v2/backend/vehicles';
        while (isVehiclesExist) {
            pageNumber++;
            const requestBodyData = {
                'filters': {'status': 'Inventory', "title":["New"]},
                "pageSize":30,
                "page":pageNumber,
            }
            const gotResponseDashboardVehicles = await request.post(urlToGetListVehiclesForDashboard, {
                headers: {
                    'Origin' : 'https://gsz.dms.symfio.de',
                    'Referer' : 'https://gsz.dms.symfio.de',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Authorization': 'Bearer ' + token,
                },
                data: requestBodyData,
            });
            expect(gotResponseDashboardVehicles.ok()).toBeTruthy();
            expect(gotResponseDashboardVehicles.status()).toBe(200);
            console.log("gotResponseDashboardVehicles:" + gotResponseDashboardVehicles);
            const responseBodyVehicles = await gotResponseDashboardVehicles.json();
            let listOfVehicles = responseBodyVehicles['data'];
            console.log("listOfVehicles.length:", listOfVehicles.length);
            if (listOfVehicles.length === 0) {
                isVehiclesExist = false;
            }
        }
        //{"pageSize":30,"page":1,"filters":{"status":["Inventory"],"title":["New"]}}
    });
});