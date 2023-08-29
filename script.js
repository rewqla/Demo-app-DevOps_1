const API_URL = "https://api.novaposhta.ua/v2.0/json/";
const API_KEY = "82553fd1d61bd7d87d24d3a51fa6c0c9";

async function GetResponse(model, method, properties) {
    return await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            apiKey: API_KEY,
            modelName: model,
            calledMethod: method,
            methodProperties: properties
        }),
    });
}

async function GetResponseResult(model, method, properties) {
    const response = await GetResponse(model, method, properties);
    let result = await response.json();

    if (!result.success)
        result = await RepeatFetch(model, method, properties);

    return result;
}

async function RepeatFetch(model, method, properties) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return await (await GetResponse(model, method, properties)).json();
}

function GetByIdValue(Id) {
    return document.getElementById(Id).value;
}

//bootstrap
$('#datepicker').datepicker({ language: 'uk', dateFormat: 'dd, mm, yy' }).datepicker().datepicker("setDate", 'now');

document.getElementById("TTN-link").addEventListener("click", (e) => {
    e.preventDefault();
    HideAll();
    document.getElementById("generator").classList.remove("d-none");
});

async function Tracking(number) {
    const trackingData = await GetResponseResult("TrackingDocument", "getStatusDocuments", {
        Documents: [
            {
                DocumentNumber: number
            }
        ]
    });
    return trackingData.data[0];
}


document.getElementById("TTN-number-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await LoadTrackingInfo();
});

async function LoadTrackingInfo(number = null) {
    HideAll();

    if (number === null) {
        number = GetByIdValue("tracking-numebr");
    }

    if (number.length == 14 && Number.isFinite(+number)) {

        let tracking_data = await Tracking(number);
        if (tracking_data) {
            console.log(tracking_data)
            document.getElementById("tracking-info").classList.remove("d-none");

            document.getElementById("package-number").innerText = number;
            document.getElementById("package-status").innerText = tracking_data.Status;
            document.getElementById("package-price").innerText = tracking_data.DocumentCost;
            document.getElementById("package-creation").innerText = tracking_data.DateCreated.split(' ')[0];
            document.getElementById("package-receiving").innerText = tracking_data.ActualDeliveryDate.split(' ')[0] ? tracking_data.RecipientDateTime.split(' ')[0].replace(/\./g, "-") : "Товар в дорозі";
        }
        else {
            document.getElementById("error-block").classList.remove("d-none");
            document.getElementById("error-text").innerText = "Не знайдено такого замовлення";
            document.getElementById("error-img").setAttribute("src", "ufo.jpg");
        }
    }
    else {
        document.getElementById("error-block").classList.remove("d-none");
        document.getElementById("error-text").innerText = "Не правильний формат номеру замовлення";
        document.getElementById("error-img").setAttribute("src", "No-Message.svg");
    }
}

function HideAll() {
    document.getElementById("generator").classList.add("d-none");
    document.getElementById("tracking-info").classList.add("d-none");
    document.getElementById("error-block").classList.add("d-none");
}

function PrintExpressPdf() {
    const num = document.getElementById("package-number").innerText;
    const url = `https://my.novaposhta.ua/orders/printDocument/orders[]/${num}/type/pdf/apiKey/${API_KEY}`;

    window.open(url, '_blank').focus();
}

function PrintExpressHtml() {
    const num = document.getElementById("package-number").textContent;
    const url = `https://my.novaposhta.ua/orders/printDocument/orders[]/${num}/type/html/apiKey/${API_KEY}`;

    window.open(url, '_blank').focus();
}

function PrintMarkingPdf() {
    const num = document.getElementById("package-number").innerText;
    const url = `https://my.novaposhta.ua/orders/printMarking85x85/orders[]/${num}/type/pdf8/apiKey/${API_KEY}`;

    window.open(url, '_blank').focus();
}

function PrintMarkingHtml() {
    const num = document.getElementById("package-number").textContent;
    const url = `https://my.novaposhta.ua/orders/printMarking85x85/orders[]/${num}/type/html/apiKey/${API_KEY}`;

    window.open(url, '_blank').focus();
}

async function GetCities(FindByString = "") {
    const cities = await GetResponseResult("Address", "getCities", {
        "FindByString": FindByString
    });

    return cities.data;
}

async function GetCounterpartyRef(type) {
    const counterparty = await GetResponseResult("Counterparty", "getCounterparties", {
        CounterpartyProperty: type,
        Page: 1
    });

    return counterparty.data[0].Ref;
}

async function GetSender(ref) {
    const sender = await GetResponseResult("Counterparty", "getCounterpartyContactPersons", {
        "Ref": ref,
    });

    return sender.data[0];
}

async function GetWarehouses(CityName) {
    const warehouses = await GetResponseResult("Address", "getWarehouses", {
        "CityName": CityName
    });

    return warehouses.data;
}

async function LoadSender() {
    const sender = await GetSender(await GetCounterpartyRef("Sender"));

    document.getElementById("sender-first-name").value = sender.FirstName;
    document.getElementById("sender-middle-name").value = sender.LastName;
    document.getElementById("sender-last-name").value = sender.MiddleName;
    document.getElementById("sender-phone").value = sender.Phones;
}


document.addEventListener('DOMContentLoaded', async () => {
    await FillSelectByWarehouses("recipient");
    await FillSelectByWarehouses("sender");
    await LoadSender();
});

document.getElementById("sender-city").addEventListener('input', async () => {
    await FillSelectByWarehouses("sender");
});

document.getElementById("recipient-city").addEventListener('input', async () => {
    await FillSelectByWarehouses("recipient");
});


document.getElementById("recipient-address").addEventListener('change', (e) => {
    if (e.target.options[e.target.selectedIndex].text.includes("Поштомат")) {
        document.getElementById("doors-section").classList.remove("d-none");
        document.getElementById("warehouse-section").classList.add("d-none")
    }
    else {
        document.getElementById("doors-section").classList.add("d-none");
        document.getElementById("warehouse-section").classList.remove("d-none")
    }
});


async function FillSelectByWarehouses(type) {
    let city = GetByIdValue(`${type}-city`);
    if (city.length < 3)
        return;

    let warehouses = await GetWarehouses(city);
    if (warehouses.length > 0) {
        const address = document.getElementById(`${type}-address`);
        address.innerHTML = '';

        if (type === "sender") {
            warehouses = warehouses.filter(element => !element.Description.includes("Поштомат"))
        }

        warehouses.forEach((warehouse) => {
            const option = document.createElement('option');
            option.text = `${warehouse.Description}`;
            option.value = warehouse.Ref;
            address.appendChild(option);
        });
    }
}

const poshta_form = document.getElementById("nova-poshta-form");
poshta_form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (CheckIfFieldsEmpty() && await CheckPersonData("recipient") && await CheckPersonData("sender") && CheckAdditionalData()) {
        let params = await CreateContactPerson(GetByIdValue("recipient-first-name"), GetByIdValue("recipient-middle-name"),
            GetByIdValue("recipient-last-name"), GetByIdValue("recipient-phone"), await GetCounterpartyRef("Recipient"));

        Object.assign(params, await FillPersonAddress(GetByIdValue("recipient-city"), GetByIdValue("recipient-address"), "Recipient"));
        Object.assign(params, await FillSender());
        Object.assign(params, await FillPersonAddress(GetByIdValue("sender-city"), GetByIdValue("sender-address"), "Sender"));
        Object.assign(params, FillAdditionData());
        Object.assign(params, ConfigureServiceType());
        Object.assign(params, BackwardDelivery());
        console.log(params)
        params.CargoType = "Parcel";

        LoadTrackingInfo(await CreateInternetDocument(params))
    }
});

async function CheckPersonData(personType) {
    return CheckInitials(personType) && CheckPhone(personType) && await CheckAddress(personType);
}

async function CheckAddress(typeOfPerson) {
    const city = GetByIdValue(typeOfPerson + "-city");
    const warehouses = await GetResponseResult("Address", "getWarehouses", {
        CityName: city
    });

    // if (ValidateInput((typeOfPerson + "-city"), !(warehouses.data.length > 0), "Введіть правильне місто", true)) {
    //     const warehouse = warehouses.data.find((w) => w.Ref === address);
    //     return ValidateInput((typeOfPerson + "-address"), !warehouse, "Проблеми з адрессою відділення", true);
    // }

    return ValidateInput((typeOfPerson + "-city"), !(warehouses.data.length > 0), "Введіть правильне місто", true);
}

function CheckPhone(typeOfPerson) {
    const regexPhone = new RegExp("^([+]?(38))?(0[0-9]{9})$");
    const phone = GetByIdValue(typeOfPerson + "-phone");

    return ValidateInput((typeOfPerson + "-phone"),
        !regexPhone.test(phone), "Не правильний формат телефону", true);
}

function CheckInitials(typeOfPerson) {
    const regexUkrainian = /^[А-ЩЬЮЯЄІЇҐа-щьюяєіїґ]+$/;
    const initials = document.getElementById(typeOfPerson + "-form").querySelectorAll(".form-control");
    let isValid = true;

    for (let i = 0; i < 3; i++) {
        isValid = ValidateInput(initials[i].id, !regexUkrainian.test(initials[i].value.trim()),
            "Дані мають містити лише українські букви", isValid);
    }

    return isValid;
}

function CheckIfFieldsEmpty() {
    const inputs = Array.from(poshta_form.querySelectorAll("form input"));
    let isValid = true;

    if (poshta_form.querySelector("#doors-section").classList.contains('d-none')) {
        inputs.splice(13, 4);
    }
    else {
        inputs.splice(11, 2);
    }
    inputs.splice(-1, 1);

    inputs.forEach(element => {
        isValid = ValidateInput(element.id, (element.value.trim() === ''), "Поле не може бути порожнім", isValid)
    });

    return isValid;
}

function GetCurrentDate() {
    const currentDate = new Date();

    const day = String(currentDate.getDate()).padStart(2, '0');
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = String(currentDate.getFullYear());

    return `${day}.${month}.${year}`;
}

function ValidateInput(Id, expression_result, error_message, isValid) {
    const errorSpan = document.querySelector(`span[for=${Id}]`);

    if (expression_result) {
        errorSpan.innerText = error_message;
        return false;
    }

    errorSpan.innerText = "";
    return isValid;
}

function CheckAdditionalData() {
    let isValid = true;

    let elem = GetByIdValue("description");
    isValid = ValidateInput("description", elem.trim().length <= 0, "Опис відправлення має бути не пустим", isValid);

    elem = GetByIdValue("cost");
    isValid = ValidateInput("cost", (+elem <= 0 || +elem > 10000 || !Number.isInteger(+elem)),
        "Ціна має бути цілим числом більшим за 0 і меншим за 10 000", isValid);

    //!!!!!!
    elem = GetByIdValue("DateTime");
    isValid = ValidateInput("DateTime", elem < GetCurrentDate(),
        "Дата не може бути меншою за сьогоднішній день", isValid);

    if (document.getElementById("warehouse-section").classList.contains("d-none")) {
        elem = +GetByIdValue("doors-weight");
        isValid = ValidateInput("doors-weight", (elem <= 0 || elem > 20 || !Number.isFinite(elem)),
            "Вага має бути числом більшим за 0 і меншим за 20", isValid);

        elem = +GetByIdValue("volumetric-width");
        isValid = ValidateInput("volumetric-width", (elem <= 0 || elem > 40 || !Number.isFinite(elem)),
            "Ширина одного місця має бути числом більшим за 0 і меншим за 40", isValid);

        elem = +GetByIdValue("volumetric-length");
        isValid = ValidateInput("volumetric-length", (elem <= 0 || elem > 60 || !Number.isFinite(elem)),
            "Довжина одного місця має бути число більшим за 0 і меншим за 60", isValid);

        elem = +GetByIdValue("volumetric-height");
        isValid = ValidateInput("volumetric-height", (elem <= 0 || elem > 30 || !Number.isFinite(elem)),
            "Висота одного місця має бути числом більшим за 0 і меншим за 30", isValid);
    }
    else {
        elem = +GetByIdValue("weight");
        isValid = ValidateInput("weight", (elem <= 0 || !Number.isFinite(elem)),
            "Вага має бути числом більшим за 0", isValid);

        elem = +GetByIdValue("seats-amount");
        isValid = ValidateInput("seats-amount", (elem <= 0 || !Number.isFinite(elem)),
            "Кількість місць має бути цілим числом більшим за 0", isValid);
    }

    return isValid;
}

async function CreateContactPerson(first_name, middle_name, last_name, phone, CounterpartyRef) {
    const recipient = await GetResponseResult("ContactPerson", "save", {
        CounterpartyRef: CounterpartyRef,
        FirstName: first_name,
        MiddleName: middle_name,
        LastName: last_name,
        Phone: phone,
    });

    return {
        "Recipient": CounterpartyRef,
        "ContactRecipient": recipient.data[0].Ref,
        "RecipientsPhone": phone
    }
}

async function FillPersonAddress(city, address, type) {
    return {
        [type + "Address"]: address,
        ["City" + type]: (await GetCities(city))[0].Ref
    };
}

async function FillSender() {
    const ref = await GetCounterpartyRef("Sender");

    return {
        "Sender": ref,
        "ContactSender": (await GetSender(ref)).Ref,
        "SendersPhone": GetByIdValue("sender-phone")
    };
}

function FillAdditionData() {
    return {
        Description: GetByIdValue("description"),
        PayerType: GetByIdValue("payer-type"),
        PaymentMethod: GetByIdValue("payment-method"),
        Cost: GetByIdValue("cost"),
        DateTime: GetByIdValue("DateTime"),
    };
}

function ConfigureServiceType() {
    let recipient_address = document.getElementById("recipient-address");

    if (recipient_address.options[recipient_address.selectedIndex].text.includes("Поштомат")) {
        return {
            "ServiceType": "DoorsWarehouse",
            "OptionsSeat": [{
                "volumetricVolume": GetByIdValue("volumetric-width")
                    * GetByIdValue("volumetric-height")
                    * GetByIdValue("volumetric-length") / 4000,
                "volumetricHeight": GetByIdValue("volumetric-length"),
                "volumetricWidth": GetByIdValue("volumetric-width"),
                "volumetricLength": GetByIdValue("volumetric-height"),
                "weight": GetByIdValue("doors-weight")
            }]
        }
    }
    else {
        return {
            "Weight": GetByIdValue("weight"),
            "SeatsAmount": GetByIdValue("seats-amount"),
            "ServiceType": "WarehouseWarehouse"
        }
    }
}

function BackwardDelivery() {
    if (document.getElementById("backward-delivery").checked) {
        return {
            "BackwardDeliveryData": [{
                "PayerType": "Recipient",
                "CargoType": "Money",
                "RedeliveryString": GetByIdValue("cost")
            }]
        };
    }
}

async function CreateInternetDocument(params) {
    const internetDocument = await GetResponseResult("InternetDocument", "save", params);
    console.log(internetDocument)
    return internetDocument.data[0].IntDocNumber;
}