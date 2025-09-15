import React, { useEffect, useRef } from "react";

function AdFitBanner() {
  // 최초 1회만 광고를 불러오기 위한 변수
  const adRef = useRef(false);

  useEffect(() => {
    // 로딩된 광고가 있으면, 추가 로딩 X
    if (adRef.current) {
      return;
    }

    const ins = document.createElement("ins");
    const script = document.createElement("script");

    ins.className = "kakao_ad_area";
    ins.style.display = "none;";

    // 윈도우 사이즈에 따라 광고 사이즈 조정(사이즈마다 해당 광고 단위 ID 적용)
    const windowSize = window.innerWidth;
    // if (windowSize < 1024) {
    ins.setAttribute("data-ad-width", "320");
    ins.setAttribute("data-ad-height", "50");
    ins.setAttribute("data-ad-unit", "DAN-jaKdyGIgnRkALWCc");
    // } else {
    // ins.setAttribute('data-ad-width', '728');
    // ins.setAttribute('data-ad-height', '90');
    // ins.setAttribute('data-ad-unit', 'DAN-E2n7vvhhl9oTgc6J');
    // ins.style.marginLeft = "12px";
    //}

    script.async = true;
    script.type = "text/javascript";
    script.src = "//t1.daumcdn.net/kas/static/ba.min.js";

    document.querySelector(".aside__kakaoAdFit")?.appendChild(ins);
    document.querySelector(".aside__kakaoAdFit")?.appendChild(script);

    // 광고 로딩 여부 상태 변경
    adRef.current = true;
  }, []);

  return (
    <>
      <div
        className="aside__kakaoAdFit"
        style={{
          width: "100%",
          position: "relative",
          top: 0,
          zIndex: 1,
        }}
      ></div>
    </>
  );
}

export default React.memo(AdFitBanner);
