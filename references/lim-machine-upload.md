# LIM X18_5 Machine Upload Configuration

## URLs to enter in the machine

Use the **custom LIM domain** in the machine’s network or cloud configuration.

| Machine setting | Value |
|---|---|
| **Data upload URL** | `https://limlifestyle.com/api/kiosk/data` |
| **Legacy QR login base URL** | `https://limlifestyle.com` |
| **Legacy QR login polling path** | `/weixin/login/xcx` (the machine appends `?token=...`) |

The data-upload route accepts HTTPS `POST` requests with `Content-Type: application/json` and returns the machine-compatible acknowledgement:

```json
{ "code": "1", "msg": "successful" }
```

## Registered physical device

The current machine is registered and active in LIM:

| Machine property | Registered value |
|---|---|
| Model | `X18_5` |
| Device number | `G260820131014906` |
| MAC address observed | `68:8f:c9:a3:84:0f` |

LIM rejects uploads from an unregistered or inactive `deviceNo`.

## User matching

LIM uses the account’s Saudi mobile number as the machine identity key.

1. The LIM app stores the number canonically as E.164, for example `+966563817217`.
2. The machine continues to send its native `userID` value, for example `0563817217`.
3. LIM normalizes both forms and links the measurement only when they represent the same mobile number.

This means the mobile number entered or returned to the machine must be the same number used for the person’s LIM account.

## Supported real X18_5 payloads

The actual machine sends separate JSON posts with the same `recordNo` and `deviceNo`. LIM merges those posts into one health reading rather than creating duplicates.

| Payload category | Native examples retained by LIM |
|---|---|
| Height and weight | `height`, `weight`, `bmi`, `weight_s`, `weight_n`, `bmi_s`, `bmi_n` |
| Blood pressure | `sbp`, `dbp`, `hr`, `sbp_s`, `sbp_n`, `dbp_s`, `dbp_n`, `hr_s`, `hr_n` |
| Body composition | `fatRate`, `skeletalMuscle`, `muscle`, `waterRate`, `protein`, `bone`, `bmr`, `vfal`, `whr`, segmental measurements, and vendor activity estimates |

LIM preserves vendor-native body-composition fields in the reading’s `machineMetrics` record. The core dashboard fields use the same native vital names:

```json
{
  "sbp": 128,
  "dbp": 93,
  "hr": 83,
  "height": "174.5",
  "weight": "76.6",
  "bmi": "25.2"
}
```

## Important first-scan limitation

The currently observed physical machine decodes a QR value and places the raw value in its local name field. That behavior alone does **not** call LIM to resolve a phone QR into a user.

The legacy URL above supports the documented machine-generated QR polling flow. The newer “machine scans a QR shown by the LIM app” flow still requires a firmware/vendor callback configuration that sends the scanned QR value to LIM. The upload endpoint configured here is sufficient for transferring a completed result when the machine sends the correct `userID` phone number.
