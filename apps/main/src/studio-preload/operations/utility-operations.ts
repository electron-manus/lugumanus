declare global {
  interface Window {
    MutationObserver: MutationObserver;
    WebKitMutationObserver: MutationObserver;
    MozMutationObserver: MutationObserver;
  }
}

export function setupUtilityOperations() {
  return {
    removeBaiduAd() {
      // 移除百度页面广告的主函数
      const killBaijiaType = 2;
      const MO =
        window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

      // 清除单个广告元素
      function clearOneAD(ele: Element): void {
        if (ele.nodeType !== 1) return;

        // 直接通过类名判断并移除广告
        if (
          ele.classList.contains('ec-tuiguang') ||
          ele.classList.contains('ec_wise_ad') ||
          ele.classList.contains('ec_youxuan_card') ||
          ele.classList.contains('page-banner')
        ) {
          ele.remove();
          return;
        }

        // 处理内容左侧区域广告
        if (
          ele.parentElement &&
          ele.parentElement.id === 'content_left' &&
          (ele.nodeName === 'DIV' || ele.nodeName === 'TABLE')
        ) {
          const s = ele.getAttribute('style');
          if (s && /display:(table|block)\s!important/.test(s)) {
            ele.remove();
          } else {
            const span = ele.querySelector('div>span');
            if (span && span.innerHTML === '广告') {
              ele.remove();
            }

            for (const span of ele.querySelectorAll('span,a')) {
              if (span && (span.innerHTML === '广告' || span.getAttribute('data-tuiguang'))) {
                ele.remove();
              }
            }

            if (killBaijiaType === 2) {
              for (const img of ele.querySelectorAll('a>div>span+img')) {
                if (
                  img &&
                  /^https?:\/\/pic\.rmb\.bdstatic\.com/.test(img.getAttribute('src') || '')
                ) {
                  ele.remove();
                }
              }
            }
          }
        }
        // 处理内容右侧区域广告
        else if (ele.parentElement && ele.parentElement.id === 'content_right') {
          if (ele.nodeName === 'TABLE') {
            const eb = ele.querySelectorAll('tbody>tr>td>div');
            for (let i = 0; i < eb.length; i++) {
              const d = eb[i];
              if (d.id !== 'con-ar') {
                d.remove();
              }
            }
          }

          if (ele.nodeName === 'DIV') {
            const nr = ele.querySelector('div>div');
            if (nr) {
              const nra = nr.querySelectorAll('a');
              for (let i = 0; i < nra.length; i++) {
                const d = nra[i];
                if (d.innerHTML === '广告') {
                  nr.remove();
                  break;
                }
              }
            }
          }
        }
        // 递归处理其他元素
        else {
          const eles = ele.querySelectorAll('#content_left>div,#content_left>table');
          for (const e of eles) {
            clearOneAD(e);
          }
        }
      }

      // 清除所有已存在的广告
      function clearAD(): void {
        if (!document.querySelectorAll) return;

        // 移除特定类名的广告
        const mAds = document.querySelectorAll('.ec_wise_ad,.ec_youxuan_card,.page-banner');
        for (const mAd of mAds) {
          mAd.remove();
        }

        // 处理左侧内容区域广告
        const list = document.querySelectorAll('#content_left>div,#content_left>table');
        for (const item of list) {
          const s = item.getAttribute('style');
          if (s && /display:(table|block)\s!important/.test(s)) {
            item.remove();
          } else {
            const span = item.querySelector('div>span');
            if (span && span.innerHTML === '广告') {
              item.remove();
            }

            for (const span of item.querySelectorAll('span,a')) {
              if (span && (span.innerHTML === '广告' || span.getAttribute('data-tuiguang'))) {
                item.remove();
              }
            }

            if (killBaijiaType === 2) {
              for (const img of item.querySelectorAll('a>div>span+img')) {
                if (
                  img &&
                  /^https?:\/\/pic\.rmb\.bdstatic\.com/.test(img.getAttribute('src') || '')
                ) {
                  item.remove();
                }
              }
            }
          }
        }

        // 处理右侧内容区域广告
        const eb = document.querySelectorAll('#content_right>table>tbody>tr>td>div');
        for (const d of eb) {
          if (d.id !== 'con-ar') {
            d.remove();
          }
        }

        const nr = document.querySelector('#content_right>div>div>div');
        if (nr) {
          const nra = nr.querySelectorAll('a');
          for (let i = 0; i < nra.length; i++) {
            const d = nra[i];
            if (d.innerHTML === '广告') {
              nr.remove();
              break;
            }
          }
        }
      }

      // 设置 MutationObserver 监听 DOM 变化
      if (MO) {
        const observer = new MO((records) => {
          for (const record of records) {
            if (record.addedNodes.length) {
              for (const addedNode of record.addedNodes) {
                clearOneAD(addedNode as Element);
              }
            }
          }
        });

        const option = {
          childList: true,
          subtree: true,
        };

        observer.observe(document, option);
      }

      // 初始运行一次清除广告
      setTimeout(clearAD, 2000);
    },
  };
}
