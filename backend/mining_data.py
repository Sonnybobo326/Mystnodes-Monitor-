"""
Mining rig catalog and per-coin network parameters.
Values are realistic approximations as of early 2026 used to compute
profitability. Network params can be tuned without touching server logic.
"""

# Hashrate units we keep coin-internal:
#  - sha256: TH/s (1 TH = 1e12 H)
#  - scrypt: GH/s (1 GH = 1e9 H)
#  - kheavyhash: TH/s (1 TH = 1e12 H)
#  - kawpow / etchash: MH/s (1 MH = 1e6 H)
#  - equihash (zec): kSol/s (1 kSol = 1e3 Sol)
#  - x11 (dash): TH/s
#  - randomx (xmr): kH/s

# Each coin entry: cg_id (CoinGecko id), symbol, algo, network_hashrate (in algo units),
# block_reward (coin per block), blocks_per_day, plus optional merge_rewards
# (extra coins minted alongside, e.g., DOGE on LTC).
COINS = {
    "bitcoin": {
        "cg_id": "bitcoin",
        "symbol": "BTC",
        "name": "Bitcoin",
        "algo": "sha256",
        "unit": "TH/s",
        "network_hashrate": 760_000_000.0,  # 760 EH/s expressed in TH/s
        "block_reward": 3.125,
        "blocks_per_day": 144,
    },
    "litecoin": {
        "cg_id": "litecoin",
        "symbol": "LTC",
        "name": "Litecoin",
        "algo": "scrypt",
        "unit": "GH/s",
        "network_hashrate": 2_500_000.0,  # 2.5 PH/s in GH/s
        "block_reward": 6.25,
        "blocks_per_day": 576,
        # LTC miners also receive merged DOGE rewards
        "merge_rewards": [{"cg_id": "dogecoin", "symbol": "DOGE", "per_block": 10000}],
    },
    "kaspa": {
        "cg_id": "kaspa",
        "symbol": "KAS",
        "name": "Kaspa",
        "algo": "kheavyhash",
        "unit": "TH/s",
        "network_hashrate": 1500.0,  # 1.5 EH/s in TH/s
        "block_reward": 5.0,  # Feb 2026 emission curve (decayed)
        "blocks_per_day": 86400,  # 1 block/sec
    },
    "ravencoin": {
        "cg_id": "ravencoin",
        "symbol": "RVN",
        "name": "Ravencoin",
        "algo": "kawpow",
        "unit": "MH/s",
        "network_hashrate": 5_500_000.0,  # 5.5 TH/s in MH/s
        "block_reward": 2500.0,
        "blocks_per_day": 1440,
    },
    "ethereum-classic": {
        "cg_id": "ethereum-classic",
        "symbol": "ETC",
        "name": "Ethereum Classic",
        "algo": "etchash",
        "unit": "MH/s",
        "network_hashrate": 260_000_000.0,  # 260 TH/s in MH/s
        "block_reward": 2.048,
        "blocks_per_day": 6500,
    },
    "zcash": {
        "cg_id": "zcash",
        "symbol": "ZEC",
        "name": "Zcash",
        "algo": "equihash",
        "unit": "kSol/s",
        "network_hashrate": 10_000_000.0,  # 10 GSol/s in kSol/s
        "block_reward": 1.5625,
        "blocks_per_day": 1152,
    },
    "dash": {
        "cg_id": "dash",
        "symbol": "DASH",
        "name": "Dash",
        "algo": "x11",
        "unit": "TH/s",
        "network_hashrate": 5500.0,  # 5.5 PH/s in TH/s
        "block_reward": 1.4,
        "blocks_per_day": 576,
    },
    "monero": {
        "cg_id": "monero",
        "symbol": "XMR",
        "name": "Monero",
        "algo": "randomx",
        "unit": "kH/s",
        "network_hashrate": 3_500_000.0,  # 3.5 GH/s in kH/s
        "block_reward": 0.6,
        "blocks_per_day": 720,
    },
    "alephium": {
        "cg_id": "alephium",
        "symbol": "ALPH",
        "name": "Alephium",
        "algo": "blake3",
        "unit": "TH/s",
        "network_hashrate": 36.0,
        "block_reward": 2.05,
        "blocks_per_day": 8640,
    },
}

# Mining rigs catalog. hashrate is in the unit shown for each algo above.
RIGS = [
    # SHA-256 / Bitcoin
    {
        "id": "antminer-s21-pro",
        "name": "Bitmain Antminer S21 Pro",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "sha256",
        "coin_id": "bitcoin",
        "hashrate": 234.0,
        "power_w": 3531,
        "price_usd": 4990,
        "release_year": 2024,
        "image": "https://images.unsplash.com/photo-1640340435201-58b14a17b6c4?w=600",
    },
    {
        "id": "antminer-s21",
        "name": "Bitmain Antminer S21",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "sha256",
        "coin_id": "bitcoin",
        "hashrate": 200.0,
        "power_w": 3500,
        "price_usd": 3290,
        "release_year": 2024,
        "image": "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600",
    },
    {
        "id": "whatsminer-m60s",
        "name": "Whatsminer M60S",
        "manufacturer": "MicroBT",
        "type": "ASIC",
        "algo": "sha256",
        "coin_id": "bitcoin",
        "hashrate": 186.0,
        "power_w": 3441,
        "price_usd": 2890,
        "release_year": 2024,
        "image": "https://images.unsplash.com/photo-1641932932583-5fdf5f7f5f9b?w=600",
    },
    {
        "id": "antminer-s19xp-hyd",
        "name": "Antminer S19 XP Hydro",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "sha256",
        "coin_id": "bitcoin",
        "hashrate": 257.0,
        "power_w": 5304,
        "price_usd": 3450,
        "release_year": 2023,
        "image": "https://images.unsplash.com/photo-1642790551116-18e150f248e5?w=600",
    },
    {
        "id": "antminer-s19j-pro-plus",
        "name": "Antminer S19j Pro+",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "sha256",
        "coin_id": "bitcoin",
        "hashrate": 122.0,
        "power_w": 3355,
        "price_usd": 1490,
        "release_year": 2023,
        "image": "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=600",
    },
    # Scrypt / Litecoin (+DOGE merge)
    {
        "id": "antminer-l9",
        "name": "Antminer L9 16Gh",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "scrypt",
        "coin_id": "litecoin",
        "hashrate": 16.0,  # 16 GH/s
        "power_w": 3360,
        "price_usd": 11900,
        "release_year": 2024,
        "image": "https://images.unsplash.com/photo-1624996379697-f01d168b1a52?w=600",
    },
    {
        "id": "antminer-l7",
        "name": "Antminer L7 9.5Gh",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "scrypt",
        "coin_id": "litecoin",
        "hashrate": 9.5,  # 9.5 GH/s
        "power_w": 3425,
        "price_usd": 6490,
        "release_year": 2022,
        "image": "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=600",
    },
    # Kaspa / kHeavyHash
    {
        "id": "antminer-ks5-pro",
        "name": "Antminer KS5 Pro",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "kheavyhash",
        "coin_id": "kaspa",
        "hashrate": 21.0,
        "power_w": 3150,
        "price_usd": 8990,
        "release_year": 2024,
        "image": "https://images.unsplash.com/photo-1624996379697-f01d168b1a52?w=600",
    },
    {
        "id": "antminer-ks5",
        "name": "Antminer KS5",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "kheavyhash",
        "coin_id": "kaspa",
        "hashrate": 15.0,
        "power_w": 3400,
        "price_usd": 5290,
        "release_year": 2024,
        "image": "https://images.unsplash.com/photo-1640340435201-58b14a17b6c4?w=600",
    },
    {
        "id": "iceriver-ks5l",
        "name": "IceRiver KS5L",
        "manufacturer": "IceRiver",
        "type": "ASIC",
        "algo": "kheavyhash",
        "coin_id": "kaspa",
        "hashrate": 12.0,
        "power_w": 3400,
        "price_usd": 4290,
        "release_year": 2024,
        "image": "https://images.unsplash.com/photo-1639815188546-c43c240ff4df?w=600",
    },
    {
        "id": "iceriver-ks3l",
        "name": "IceRiver KS3L",
        "manufacturer": "IceRiver",
        "type": "ASIC",
        "algo": "kheavyhash",
        "coin_id": "kaspa",
        "hashrate": 5.0,
        "power_w": 3200,
        "price_usd": 2390,
        "release_year": 2023,
        "image": "https://images.unsplash.com/photo-1640340435201-58b14a17b6c4?w=600",
    },
    # KAWPOW / Ravencoin (GPU rigs)
    {
        "id": "rig-rtx4090-x6",
        "name": "GPU Rig - 6x RTX 4090",
        "manufacturer": "Custom",
        "type": "GPU",
        "algo": "kawpow",
        "coin_id": "ravencoin",
        "hashrate": 390.0,  # ~65 MH/s each
        "power_w": 2400,
        "price_usd": 14400,
        "release_year": 2024,
        "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600",
    },
    {
        "id": "rig-rtx3090-x6",
        "name": "GPU Rig - 6x RTX 3090",
        "manufacturer": "Custom",
        "type": "GPU",
        "algo": "kawpow",
        "coin_id": "ravencoin",
        "hashrate": 300.0,  # ~50 MH/s each
        "power_w": 2100,
        "price_usd": 6300,
        "release_year": 2022,
        "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600",
    },
    # Etchash / ETC
    {
        "id": "rig-rtx3080-x8-etc",
        "name": "GPU Rig - 8x RTX 3080 (ETC)",
        "manufacturer": "Custom",
        "type": "GPU",
        "algo": "etchash",
        "coin_id": "ethereum-classic",
        "hashrate": 720.0,  # ~90 MH/s each
        "power_w": 1900,
        "price_usd": 5600,
        "release_year": 2022,
        "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600",
    },
    {
        "id": "rig-rx6800-x8-etc",
        "name": "GPU Rig - 8x RX 6800",
        "manufacturer": "Custom",
        "type": "GPU",
        "algo": "etchash",
        "coin_id": "ethereum-classic",
        "hashrate": 504.0,
        "power_w": 1700,
        "price_usd": 4400,
        "release_year": 2022,
        "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600",
    },
    # Equihash / ZEC
    {
        "id": "antminer-z15-pro",
        "name": "Antminer Z15 Pro",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "equihash",
        "coin_id": "zcash",
        "hashrate": 840.0,  # 840 kSol/s
        "power_w": 2560,
        "price_usd": 4290,
        "release_year": 2023,
        "image": "https://images.unsplash.com/photo-1640340435201-58b14a17b6c4?w=600",
    },
    {
        "id": "antminer-z15e",
        "name": "Antminer Z15e",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "equihash",
        "coin_id": "zcash",
        "hashrate": 3.6,  # 3.6 kSol/s
        "power_w": 1300,
        "price_usd": 990,
        "release_year": 2023,
        "image": "https://images.unsplash.com/photo-1640340435201-58b14a17b6c4?w=600",
    },
    # X11 / DASH
    {
        "id": "antminer-d9",
        "name": "Antminer D9",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "x11",
        "coin_id": "dash",
        "hashrate": 1.77,  # 1.77 TH/s
        "power_w": 2839,
        "price_usd": 3990,
        "release_year": 2022,
        "image": "https://images.unsplash.com/photo-1639815188546-c43c240ff4df?w=600",
    },
    {
        "id": "antminer-d7",
        "name": "Antminer D7",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "x11",
        "coin_id": "dash",
        "hashrate": 1.286,  # 1286 GH/s = 1.286 TH/s
        "power_w": 3148,
        "price_usd": 1190,
        "release_year": 2021,
        "image": "https://images.unsplash.com/photo-1640340435201-58b14a17b6c4?w=600",
    },
    # RandomX / XMR
    {
        "id": "epyc-7763-rig",
        "name": "AMD EPYC 7763 CPU Rig",
        "manufacturer": "Custom",
        "type": "CPU",
        "algo": "randomx",
        "coin_id": "monero",
        "hashrate": 44.0,  # 44 kH/s
        "power_w": 280,
        "price_usd": 6800,
        "release_year": 2023,
        "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600",
    },
    {
        "id": "ryzen-9-7950x-rig",
        "name": "Ryzen 9 7950X CPU Rig",
        "manufacturer": "Custom",
        "type": "CPU",
        "algo": "randomx",
        "coin_id": "monero",
        "hashrate": 26.0,
        "power_w": 230,
        "price_usd": 1900,
        "release_year": 2023,
        "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600",
    },
    # Blake3 / Alephium
    {
        "id": "iceriver-al3",
        "name": "IceRiver AL3",
        "manufacturer": "IceRiver",
        "type": "ASIC",
        "algo": "blake3",
        "coin_id": "alephium",
        "hashrate": 2.0,  # 2 TH/s
        "power_w": 3500,
        "price_usd": 9990,
        "release_year": 2024,
        "image": "https://images.unsplash.com/photo-1639815188546-c43c240ff4df?w=600",
    },
    {
        "id": "bitmain-al1",
        "name": "Bitmain Antminer AL1",
        "manufacturer": "Bitmain",
        "type": "ASIC",
        "algo": "blake3",
        "coin_id": "alephium",
        "hashrate": 1.5,
        "power_w": 3450,
        "price_usd": 8290,
        "release_year": 2024,
        "image": "https://images.unsplash.com/photo-1640340435201-58b14a17b6c4?w=600",
    },
]


def normalize_hashrate_to_base(hashrate: float, unit: str) -> float:
    """Convert any hashrate value to absolute hashes/sec (or sols/sec for Equihash)."""
    multipliers = {
        "H/s": 1.0,
        "kH/s": 1e3,
        "MH/s": 1e6,
        "GH/s": 1e9,
        "TH/s": 1e12,
        "PH/s": 1e15,
        "EH/s": 1e18,
        "Sol/s": 1.0,
        "kSol/s": 1e3,
    }
    return hashrate * multipliers[unit]
