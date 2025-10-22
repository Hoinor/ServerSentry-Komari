'use client';

import React from 'react';
import Image from 'next/image';
import type { Server } from '@/types/server';
import { formatDurationEnShort } from '@/lib/utils';
import { createCpuFormatter, createSwapFormatter, formatKiB, formatMiB } from '@/lib/utils';
import { ServerMetric } from './server-metric';
import { Clock, MapPin, Server as ServerIcon } from 'lucide-react';

// 将emoji国旗转换为国家代码
const emojiToCountryCode = (emoji: string): string | null => {
  if (!emoji) return null;
  
  // 将emoji字符串转换为数组，正确处理Unicode代理对
  const chars = Array.from(emoji);
  if (chars.length !== 2) return null;
  
  // 获取每个字符的代码点
  const codePoints = chars.map(char => char.codePointAt(0));
  if (codePoints.length !== 2 || !codePoints[0] || !codePoints[1]) return null;
  
  // Regional Indicator Symbol 的基础值是 0x1F1E6 (对应 'A')
  const baseCodePoint = 0x1F1E6;
  
  // 验证代码点是否在正确范围内
  if (codePoints[0] < baseCodePoint || codePoints[0] > 0x1F1FF || 
      codePoints[1] < baseCodePoint || codePoints[1] > 0x1F1FF) {
    return null;
  }
  
  const firstLetter = String.fromCharCode(codePoints[0] - baseCodePoint + 65); // 65 是 'A' 的 ASCII
  const secondLetter = String.fromCharCode(codePoints[1] - baseCodePoint + 65);
  
  const result = firstLetter + secondLetter;
  
  // 调试信息（生产环境可以移除）
  console.log(`Emoji: ${emoji}, CodePoints: [${codePoints[0].toString(16)}, ${codePoints[1].toString(16)}], Result: ${result}`);
  
  return result;
};

// 获取国旗显示函数 - 使用SVG图标
const getCountryFlag = (location: string): React.ReactNode => {
  if (!location) {
    return (
      <Image 
        src="/flags/UN.svg" 
        alt="Unknown" 
        width={24}
        height={16}
        className="w-6 h-4 object-cover rounded-sm"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  
  // 检查location是否包含emoji国旗
  // Unicode国旗emoji范围: U+1F1E6-U+1F1FF (Regional Indicator Symbols)
  const flagEmojiRegex = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
  const match = location.match(flagEmojiRegex);
  
  if (match) {
    // 将emoji转换为国家代码
    const countryCode = emojiToCountryCode(match[0]);
    
    if (countryCode) {
      return (
        <Image 
          src={`/flags/${countryCode}.svg`} 
          alt={countryCode} 
          width={24}
          height={16}
          className="w-6 h-4 object-cover rounded-sm"
          onError={(e) => {
            // 如果SVG加载失败，显示原始emoji
            e.currentTarget.outerHTML = `<span class="text-lg">${match[0]}</span>`;
          }}
        />
      );
    }
  }
  
  // 如果没有找到国旗emoji或转换失败，返回默认地球图标
  return (
    <Image 
      src="/flags/UN.svg" 
      alt="Unknown" 
      width={24}
      height={16}
      className="w-6 h-4 object-cover rounded-sm"
      onError={(e) => {
        e.currentTarget.outerHTML = '<span class="text-lg">🌍</span>';
      }}
    />
  );
};

// 导入拆分后的组件
import {
  // StatusIndicator,
  StatusBadge,
  RealTimeNetworkPanel,
  TotalTrafficPanel,
  IPStatusBadges
} from './server';

interface ServerCardProps {
  server: Server;
}

export const ServerCard: React.FC<ServerCardProps> = React.memo(function ServerCard({ server }) {
  const isOnline = server.online4 || server.online6;

  // CPU 显示格式化，限制最多1位小数（移至 utils）
  const cpuFormatter = React.useMemo(() => createCpuFormatter('zh-CN', 1), []);

  // SWAP特殊处理（移至 utils）
  const swapFormatter = React.useMemo(() => createSwapFormatter(server.swap_total), [server.swap_total]);

  // 缓存格式化函数（移至 utils）
  const memoryFormatter = React.useCallback((val: number) => formatKiB(val), []);
  const diskFormatter = React.useCallback((val: number) => formatMiB(val), []);

  return (
    <div className="h-full server-card card-glass glass-hover rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer">
      {/* 服务器信息头部 */}
      <ServerCardHeader
        server={server}
        isOnline={isOnline}
      />

      {/* 服务器指标内容 */}
      <div className="p-4 pt-0 space-y-3 flex-grow flex flex-col">
        <ServerMetric
          label="CPU"
          value={server.cpu}
          total={100}
          unit="%"
          formatter={cpuFormatter}
        />

        <ServerMetric
          label="内存"
          value={server.memory_used}
          total={server.memory_total}
          formatter={memoryFormatter}
        />

        <ServerMetric
          label="硬盘"
          value={server.hdd_used}
          total={server.hdd_total}
          formatter={diskFormatter}
        />

        <ServerMetric
          label="SWAP"
          value={server.swap_used}
          total={server.swap_total || 1}
          formatter={swapFormatter}
        />

        {/* 网络面板 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 mt-auto">
          <RealTimeNetworkPanel
            downloadSpeed={server.network_rx}
            uploadSpeed={server.network_tx}
          />

          <TotalTrafficPanel
            totalDownload={server.network_in}
            totalUpload={server.network_out}
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 仅比较会影响 UI 的关键字段，避免昂贵的深度比较
  const prev = prevProps.server;
  const next = nextProps.server;

  return (
    prev.name === next.name &&
    prev.alias === next.alias &&
    prev.type === next.type &&
    prev.location === next.location &&
    prev.online4 === next.online4 &&
    prev.online6 === next.online6 &&
    prev.uptime === next.uptime &&
    prev.cpu === next.cpu &&
    prev.memory_total === next.memory_total &&
    prev.memory_used === next.memory_used &&
    prev.swap_total === next.swap_total &&
    prev.swap_used === next.swap_used &&
    prev.hdd_total === next.hdd_total &&
    prev.hdd_used === next.hdd_used &&
    prev.network_rx === next.network_rx &&
    prev.network_tx === next.network_tx &&
    prev.network_in === next.network_in &&
    prev.network_out === next.network_out
  );
});
ServerCard.displayName = 'ServerCard';

// 服务器卡片头部组件 - 独立记忆化
interface ServerCardHeaderProps {
  server: Server;
  isOnline: boolean;
}

const ServerCardHeader: React.FC<ServerCardHeaderProps> = React.memo(function ServerCardHeader({
  server,
  isOnline
}) {
  return (
    <div className="p-4 pb-2 space-y-2">
      {/* 名称和状态行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 max-w-[70%]">
          <div className="flex-shrink-0">
            {getCountryFlag(server.location || '')}
          </div>
          <span className="text-xl truncate" suppressHydrationWarning>
            {server.alias || server.name}
          </span>
        </div>
        <StatusBadge isOnline={isOnline} />
      </div>

      {/* 运行时间和标签行 */}
      <div className="flex items-center justify-between">
        <UptimeDisplay uptime={server.uptime} />

        <div className="flex items-center gap-0.5 overflow-hidden">
          <IPStatusBadges
            ipv4Online={server.online4}
            ipv6Online={server.online6}
          />
          {server.type && <ServerTypeTag label={server.type} />}
          {/* {server.location && <LocationTag label={server.location} />} */}
        </div>
      </div>
    </div>
  );
});

// 运行时间显示组件
const UptimeDisplay: React.FC<{ uptime: string }> = React.memo(function UptimeDisplay({ uptime }) {
  // uptime 传入为 "{seconds}s" 或空字符串
  const human = React.useMemo(() => {
    if (!uptime) return '';
    const match = uptime.match(/^(\d+)s$/);
    if (!match) return uptime;
    const seconds = parseInt(match[1], 10);
    return formatDurationEnShort(seconds, 3);
  }, [uptime]);
  return (
    <span className="inline-flex items-center text-muted-foreground text-xs whitespace-nowrap" title={human}>
      <Clock className="h-3.5 w-3.5 mr-1" />
      <span suppressHydrationWarning>{human || '—'}</span>
    </span>
  );
});
UptimeDisplay.displayName = 'UptimeDisplay';

// 服务器类型标签
const ServerTypeTag: React.FC<{ label: string }> = React.memo(function ServerTypeTag({ label }) {
  return (
    <span className="inline-flex items-center h-6 px-2 rounded-full text-xs font-medium bg-secondary/40 text-foreground/80 whitespace-nowrap">
      <ServerIcon className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
      <span className="truncate max-w-[8rem]" suppressHydrationWarning>{label}</span>
    </span>
  );
});
ServerTypeTag.displayName = 'ServerTypeTag';

// 位置标签
const LocationTag: React.FC<{ label: string }> = React.memo(function LocationTag({ label }) {
  return (
    <span className="inline-flex items-center h-6 px-2 rounded-full text-xs font-medium bg-secondary/40 text-foreground/80 whitespace-nowrap">
      <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
      <span className="truncate max-w-[10rem]" suppressHydrationWarning>{label}</span>
    </span>
  );
});
LocationTag.displayName = 'LocationTag';
