// ==UserScript==
// @name         BSCScan Enhancer
// @namespace    http://tampermonkey.net/
// @version      2
// @description  This extension let you check converted price for new coin.
// @author       Popura
// @match        https://bscscan.com/*
// @icon         https://www.google.com/s2/favicons?domain=bscscan.com
// @run-at       document-idle
// ==/UserScript==

function formatNumber(value) {
    var newValue = value;
    if (value >= 1000 & value < 10000000000 & false) {
        value = Math.floor(value);
        var suffixes = ["", "k", "m", "b", "t"];
        var suffixNum = Math.floor( (""+value).length/3 );
        var shortValue = '';
        for (var precision = 2; precision >= 1; precision--) {
            shortValue = parseFloat( (suffixNum != 0 ? (value / Math.pow(1000,suffixNum) ) : value).toPrecision(precision));
            var dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g,'');
            if (dotLessShortValue.length <= 2) { break; }
        }
        if (shortValue % 1 != 0) shortValue = shortValue.toFixed(2).replace(/[.,]00$/, "");
        newValue = shortValue+suffixes[suffixNum];
    } else if (value < 1e-3 || value >= 10000000000) {
        newValue = value.toExponential(2);
    } else {
        newValue = value.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
    return newValue;
}

async function getTokenInfo(tokenAddress) {
    const PANCAKE_ROUTER_V2 = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
    const PANCAKE_FACTORY_V2 = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
    const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
    const BUSD_ADDRESS = '0xe9e7cea3dedca5984780bafc599bd69add087d56';
    const HTTP_PROVIDER_LINK = 'https://bsc-dataseed1.binance.org:443';
    const PANCAKE_ROUTER_V2_ABI = [
        {"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsOut","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"}
    ];
    const PANCAKE_FACTORY_V2_ABI = [
        {"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"getPair","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}
    ];
    const TOKEN_ABI = [
        {"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":true,"inputs":[],"name":"getOwner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":true,"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"_owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
    ];
    const BURN_ADDRESS = '0x000000000000000000000000000000000000dead';
    var web3 = new Web3Eth(new Web3Eth.providers.HttpProvider(HTTP_PROVIDER_LINK));
    var pancakeRouter = new web3.Contract(PANCAKE_ROUTER_V2_ABI, PANCAKE_ROUTER_V2);
    var pancakeFactory = new web3.Contract(PANCAKE_FACTORY_V2_ABI, PANCAKE_FACTORY_V2);
    var tokenContract = new web3.Contract(TOKEN_ABI, tokenAddress);

    var WBNB_BUSDPair = await pancakeRouter.methods.getAmountsOut((1e18).toString(),[WBNB_ADDRESS, BUSD_ADDRESS]).call();
    var bnbPrice = parseFloat(WBNB_BUSDPair[1]/1e18);
    console.log("1 BNB = " + bnbPrice + " USD");

    var token = {
        name: await tokenContract.methods.name().call(),
        decimals: Number(await tokenContract.methods.decimals().call()),
        symbol: await tokenContract.methods.symbol().call(),
        ownerAddress: '',
        lpAddress: '',
        price: {},
        marketCap: {}
    };

    token.totalSupply = Number(await tokenContract.methods.totalSupply().call())/10**token.decimals;
    token.burnAmount = Number(await tokenContract.methods.balanceOf(BURN_ADDRESS).call())/10**token.decimals;
    token.circulatingSupply = token.totalSupply - token.burnAmount;

    // Try get owner address
    try {
        token.ownerAddress = await tokenContract.methods.getOwner().call();
    } catch {
        try {
            token.ownerAddress = await tokenContract.methods.owner().call();
        } catch {
            try {
                token.ownerAddress = await tokenContract.methods._owner().call();
            } catch {
                console.log("Contract did not renouce owner.");
            }
        }
    }
    token.ownerAddress = token.ownerAddress.toLowerCase();

    var amountOutBnb = [0, 0];
    try {
        token.lpAddress = await pancakeFactory.methods.getPair(tokenAddress, WBNB_ADDRESS).call();
        token.lpAddress = token.lpAddress.toLowerCase();
        amountOutBnb = await pancakeRouter.methods.getAmountsOut((10**token.decimals).toString(), [tokenAddress, WBNB_ADDRESS]).call();
    } catch (e) {
        console.log("Not found pair " + token.symbol + "-BNB on PancakeSwap.");
    }
    token.price.bnb = parseFloat(amountOutBnb[1])/1e18;
    token.price.usd = token.price.bnb * bnbPrice;
    token.marketCap.bnb = token.price.bnb * token.circulatingSupply;
    token.marketCap.usd = token.price.usd * token.circulatingSupply;

    console.log(token);
    return token;
}

function updateInfo(token) {
    if (unsafeWindow.currentPriceValue != "0") return;
    // Price
    var priceElement = $('#ContentPlaceHolder1_tr_valuepertoken > div > div:nth-child(1) > span');
    priceElement.html(`\$${formatNumber(token.price.usd)}<span class="small text-secondary text-nowrap"> @ ${formatNumber(token.price.bnb)} BNB</span>`);


    // Total Supply & Circulating Supply
    var totalSupplyElement = $('#ContentPlaceHolder1_divSummary > div.row.mb-4 > div.col-md-6.mb-3.mb-md-0 > div > div.card-body > div.row.align-items-center > div.col-md-8.font-weight-medium > span.hash-tag.text-truncate');
    var CSupplyElement = $('#ContentPlaceHolder1_divSummary > div.row.mb-4 > div.col-md-6.mb-3.mb-md-0 > div > div.card-body > div.row.align-items-center > div.col-md-8.font-weight-medium > span.text-secondary.ml-1');
    var CSupplyPercent = (token.circulatingSupply*100)/token.totalSupply;
    totalSupplyElement.text(formatNumber(token.totalSupply));
    CSupplyElement.html(`<span data-toggle="tooltip" title="" data-original-title="Circulating Supply: ${formatNumber(token.circulatingSupply)}">(CSupply: ${formatNumber(CSupplyPercent)}%)</span>`);
    CSupplyElement.find('[data-toggle="tooltip"]').tooltip();

    // Market Cap
    var marketCapElement = $('#pricebutton').parent();
    marketCapElement.html(`<span class="u-label u-label--sm u-label--value u-label--text-dark u-label--secondary rounded" data-toggle="tooltip" data-placement="auto" id="pricebutton" data-html="true" title="" data-original-title="">$${formatNumber(token.marketCap.usd)}</span><span class="small text-secondary text-nowrap"> @ ${formatNumber(token.marketCap.bnb)} BNB</span>`);
    if ($('#ContentPlaceHolder1_divFilteredHolderBalance').length >= 1) {
        var holderBalanceElement = $('#ContentPlaceHolder1_divFilteredHolderBalance');
        var holderBalance = parseFloat($('#ContentPlaceHolder1_divFilteredHolderBalance').html().split("\n")[2].replace(/[^0-9.]/g, ""));
        holderBalanceElement.html(`\n<h6 class="small text-uppercase text-secondary mb-1">Balance</h6>\n${formatNumber(holderBalance)} ${token.symbol}\n`);
        var holderValueElement = $('#ContentPlaceHolder1_divFilteredHolderValue');
        var holderValue = holderBalance * token.price.usd;
        holderValueElement.html(`\n<hr class="d-block d-md-none my-2">\n<h6 class="small text-uppercase text-secondary mb-1">Value</h6>\n$${formatNumber(holderValue)}\n`);
    }
}

function updateTable(token) {
    // Transfers
    var txTable = $('#tokentxnsiframe').contents().find('#maindiv');
    txTable.find('div.table-responsive.mb-2.mb-md-0 > table > tbody > tr').each(function(i, e){
        var quantityElement = $(this).find("td:nth-child(7)");
        var quantity = parseFloat(quantityElement.text().replace(/,/g, ""));
        var fromElement = $(this).find("td:nth-child(4) > a");
        var toElement = $(this).find("td:nth-child(6) > a");
        var iconElement = $(this).find("td:nth-child(5) > span");
        fromElement.text().toLowerCase() == token.ownerAddress ? fromElement.text(`${token.name}: Owner`) : null;
        fromElement.text().toLowerCase() == token.lpAddress ? fromElement.text(`PcS: ${token.symbol}-LP v2`) : null;
        toElement.text().toLowerCase() == token.ownerAddress ? toElement.text(`${token.name}: Owner`) : null;
        toElement.text().toLowerCase() == token.lpAddress ? toElement.text(`PcS: ${token.symbol}-LP v2`) && iconElement.addClass('btn-soft-danger').removeClass('btn-soft-success') : null;
        var price_bnb = quantity * token.price.bnb;
        quantityElement.text(`${formatNumber(quantity)} (${formatNumber(price_bnb)} BNB)`)
    });
    txTable.attr('updated', '');

    // Holders
    var holderTable = $('#tokeholdersiframe').contents().find('#maintable');
    holderTable.find('div:nth-child(3) > table > tbody > tr').each(function(i, e){
        var quantityElement = $(this).find("td:nth-child(3)");
        var quantity = parseFloat(quantityElement.text().replace(/,/g, ""));
        var addressElement = $(this).find("td:nth-child(2) > span > a");
        addressElement.text().toLowerCase() == token.ownerAddress ? addressElement.text(`${token.name}: Owner`) : null;
        addressElement.text().toLowerCase() == token.lpAddress ? addressElement.text(`PcS: ${token.symbol}-LP v2`) : null;
        var price_bnb = quantity * token.price.bnb;
        quantityElement.text(`${formatNumber(quantity)} (${formatNumber(price_bnb)} BNB)`)
    });
    holderTable.attr('updated', '');
}

(async function() {
    'use strict';
    if (window.top != window.self) return;
    console.log("Price Enchance Script Loaded.");
    var ethRegEx = /(0x[a-fA-F0-9]{40})/g;
    var pageType = location.pathname.split("/")[1];
    switch (pageType) {
        case "token": {
            // Validate Address
            var tokenAddress = location.pathname.split("/")[2];
            if (!ethRegEx.test(tokenAddress)) {
                break;
            }
            // Fetch Token Data
            var token = await getTokenInfo(tokenAddress);
            updateInfo(token);
            setInterval(async function() {
                token = await getTokenInfo(tokenAddress);
                updateInfo(token);
            }, 10000);

            // Update Page
            var checkExist = setInterval(function() {
                if ($('#tokentxnsiframe').contents().find('#maindiv:not([updated])').length || $('#tokeholdersiframe').contents().find('#maintable:not([updated])').length) {
                    setTimeout(function() { updateTable(token); }, 250);
                }
            }, 1000);
            break;
        }
        default: {
            return;
        }
    }

})();
