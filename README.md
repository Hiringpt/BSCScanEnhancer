# BSCScanEnhancer
This is an userscript use for fetching price, market cap, owner/lp data of shit coin that normally doesn't show token info.

Usually, for newly created tokens that haven't submit address info or burn details to the BSCScan site, it will not show price/market cap/etc.
This script will directly fetch these data from the PancakeSwap contract itself and calculate them for you.

- This extension will fetch latest price directly from PancakeSwap(V2) contract router it will guarantee you the most updated price.
- All long digits will be converted to scientific notation which makes it easier for your eyes. (standard abbreviation getting confuse after trillion)
- Circulating Supply (and Market Cap) calculated from (Total Supply - Amount in Dead Address) so if project using the custom address for burning it won't be included.
- Automatic add a name tag to Token's Owner Address in Transfer/Holders. (Only if token had renounced its owner)
- Automatic add a name tag to Token's PancakeV2 LP Address in Transfer/Holders
- Change arrow color to red when transaction target is LP address (selling).

To install
1. Install TamperMonkey (or ViolentMokey) in Chrome's extension.
2. Go to TamperMonkey extension menu and click "Create new script".
3. Open the script file and copy and paste the whole text into TamperMonkey's editor.
4. File > Save (or Ctrl+S)
