import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  CircleAlert,
  MapPin,
  Wifi,
} from 'lucide-react'

const gateways = [
  { id: 'GW-01', tags: 4 },
  { id: 'GW-02', tags: 3 },
  { id: 'GW-03', tags: 3 },
]

const assets = [
  { id: 'A001', tag: 'BT-1A2B', type: 'Chair', location: 'Storeroom L1', gateway: 'GW-01', battery: 92, seen: '48m ago' },
  { id: 'A002', tag: 'BT-3C4D', type: 'Chair', location: 'Storeroom L1', gateway: 'GW-01', battery: 78, seen: '48m ago' },
  { id: 'A003', tag: 'BT-5E6F', type: 'Table', location: 'Storeroom L2', gateway: 'GW-02', battery: 61, seen: '48m ago' },
  { id: 'A004', tag: 'BT-7G8H', type: 'Table', location: 'Storeroom L2', gateway: 'GW-02', battery: 34, seen: '49m ago' },
  { id: 'A005', tag: 'BT-9I0J', type: 'Chair', location: 'Ballroom A', gateway: 'GW-03', battery: 18, seen: '51m ago' },
  { id: 'A006', tag: 'BT-KKLL', type: 'Podium', location: 'Storeroom L1', gateway: 'GW-01', battery: 88, seen: '48m ago' },
  { id: 'A007', tag: 'BT-MMNN', type: 'Table', location: 'Ballroom B', gateway: 'GW-03', battery: 45, seen: '48m ago' },
  { id: 'A008', tag: 'BT-PPQQ', type: 'Chair', location: 'Storeroom L2', gateway: 'GW-02', battery: 8, seen: '48m ago' },
  { id: 'A009', tag: 'BT-RRSS', type: 'Chair', location: 'Storeroom L1', gateway: 'GW-01', battery: 95, seen: '48m ago' },
]

const getBatteryLevel = (percentage: number) => {
  if (percentage <= 20) return 'critical'
  if (percentage <= 50) return 'warning'
  return 'healthy'
}

const getBatteryIcon = (percentage: number) => {
  if (percentage <= 20) return BatteryLow
  if (percentage <= 50) return BatteryMedium
  return BatteryFull
}

export default function AssetsView() {
  return (
    <section className="assets-workspace" aria-label="Asset monitoring">
      <div className="gateway-strip">
        {gateways.map((gateway) => (
          <article className="gateway-card" key={gateway.id}>
            <span className="gateway-icon"><Wifi size={17} /></span>
            <span className="gateway-info"><strong>{gateway.id}</strong><small>{gateway.tags} linked tags · <b>LIVE</b></small></span>
          </article>
        ))}
      </div>

      <div className="asset-table-scroll">
        <table className="asset-table">
          <thead><tr><th>Asset ID</th><th>BLE Tag</th><th>Type</th><th>Location</th><th>Gateway</th><th>Battery</th><th>Last Seen</th></tr></thead>
          <tbody>
            {assets.map((asset) => {
              const BatteryIcon = getBatteryIcon(asset.battery)
              return (
                <tr key={asset.id}>
                  <td className="asset-id">{asset.id}</td>
                  <td className="asset-tag">{asset.tag}</td>
                  <td>{asset.type}</td>
                  <td><span className="asset-location"><MapPin size={12} />{asset.location}</span></td>
                  <td className="asset-gateway">{asset.gateway}</td>
                  <td>
                    <span className={`asset-battery battery-${getBatteryLevel(asset.battery)}`}>
                      <BatteryIcon size={13} />{asset.battery}%
                      {asset.battery < 10 && <CircleAlert className="battery-warning-icon" size={14} role="img" aria-label="Battery below 10 percent" />}
                    </span>
                  </td>
                  <td className="asset-last-seen">{asset.seen}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
