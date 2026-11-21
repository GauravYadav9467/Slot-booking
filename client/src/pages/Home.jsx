import Card from "../components/ui/exploreCard";
import CheckOutCard from "../components/ui/checkoutCard";
import Footer from "../components/layout/footer";
import Navbar from "../components/layout/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen w-full bg-[#0F2128]">
        <div className="home bg-[#0F2128] text-white min-h-screen max-w-[85%] mx-auto flex p-5 flex-col">
          <h1 className="text-4xl font-bold  ">
            Reserve Your
            <span className="ml-3 text-[#00F0FF]">Battle Station</span>
          </h1>
          <h3 className="text-lg mt-3 max-w-[40vw]">
            Zero-latency gigabit fiber, overclocked RTX 4090 rigs, 540Hz QD-OLED
            panels, Fanatec motion cockpits & cozy streamer suites.
          </h3>
          <div className="HomeBody flex items-start mt-5 gap-5 w-full">
            <div className="leftCont w-[75%] shrink-0 flex flex-wrap items-start content-start gap-5 max-w-[70%] p-2">
              <Card />
              <Card />
              <Card />
              <Card />
              <Card />
              <Card />
              <Card />
              <Card />
            </div>
            <div className="rightCont relative flex-2 min-w-0 self-stretch">
              <div className="sticky top-[60px]">
                <CheckOutCard />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
