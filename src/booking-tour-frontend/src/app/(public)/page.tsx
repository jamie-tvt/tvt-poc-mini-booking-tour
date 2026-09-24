import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, ShieldCheck, Tag } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { HeroSearch } from "@/features/tours/components/HeroSearch";
import { TourGrid } from "@/features/tours/components/TourCard";
import { tourServer } from "@/features/tours/services/tourServer";
import { errorMessage } from "@/lib/api/errors";
import { HOME_HERO_IMAGE, unsplashSrcSet, unsplashVariant } from "@/lib/utils/images";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [toursRes, catsRes] = await Promise.allSettled([
    tourServer.search({ sort: "nextDeparture" }, 6),
    tourServer.categories(),
  ]);
  const categories = catsRes.status === "fulfilled" ? catsRes.value : [];

  return (
    <>
      {/* Hero: ảnh thật full-bleed + gradient tối từ dưới lên để chữ trắng đạt tương phản; form tìm kiếm kính mờ đè mép dưới */}
      <section className="relative isolate overflow-hidden bg-night text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={unsplashVariant(HOME_HERO_IMAGE, 1600)}
          srcSet={unsplashSrcSet(HOME_HERO_IMAGE, [800, 1200, 1600, 2400])}
          sizes="100vw"
          alt=""
          width={1600}
          height={900}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-night/30 via-night/45 to-night/85" aria-hidden="true" />
        <Container className="flex min-h-[26rem] flex-col justify-end pb-32 pt-16 sm:min-h-[30rem] sm:pb-36 lg:min-h-[34rem] lg:pb-32">
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-100 [text-shadow:0_1px_8px_rgb(0_0_0/0.35)]">
            Miền Tây sông nước · Biển đảo phương Nam
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.35)] sm:text-4xl lg:text-5xl">
            Đi chợ nổi lúc bình minh, ngắm hoàng hôn trên đảo ngọc
          </h1>
          <p className="mt-4 max-w-2xl text-base text-sky-50 [text-shadow:0_1px_8px_rgb(0_0_0/0.35)] sm:text-lg">
            Chọn tour, chọn đợt khởi hành, giữ chỗ ngay và thanh toán trong vài phút.
          </p>
        </Container>
      </section>
      <Container className="relative z-10 -mt-24 sm:-mt-28 lg:-mt-20">
        <HeroSearch categories={categories} />
      </Container>

      <Container className="py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Tour sắp khởi hành</h2>
            <p className="mt-1 text-ink-soft">Những đợt gần nhất còn chỗ — đặt sớm để giữ giá tốt.</p>
          </div>
          <Link href="/tours?sort=nextDeparture" className="inline-flex items-center gap-1 rounded-md font-semibold text-brand hover:underline">
            Xem tất cả tour <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {toursRes.status === "rejected" ? (
          <ErrorState message={errorMessage(toursRes.reason, undefined)} action={<LinkButton href="/">Tải lại trang</LinkButton>} />
        ) : toursRes.value.content.length === 0 ? (
          <EmptyState title="Chưa có tour đang mở bán" description="Các tour mới sẽ sớm được cập nhật." />
        ) : (
          <TourGrid tours={toursRes.value.content} />
        )}
      </Container>

      {categories.length > 0 && (
        <section className="border-y border-line bg-white" aria-labelledby="cat-heading">
          <Container className="py-12">
            <h2 id="cat-heading" className="text-2xl font-bold sm:text-3xl">
              Khám phá theo danh mục
            </h2>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/tours?categoryId=${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg p-4 transition-colors duration-200 hover:border-brand hover:bg-sky-soft"
                  >
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      <Tag className="size-4 text-cta" aria-hidden="true" /> {c.name}
                    </span>
                    {c.tourCount !== undefined && <span className="text-sm text-ink-soft">{c.tourCount} tour</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <Container className="py-12">
        <h2 className="text-2xl font-bold sm:text-3xl">Đặt tour yên tâm</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { Icon: Clock3, title: "Giữ chỗ tức thì", text: "Chỗ được giữ ngay khi đặt, bạn có thời gian thanh toán trước khi hết hạn." },
            { Icon: ShieldCheck, title: "Không lo trùng chỗ", text: "Số chỗ luôn cập nhật theo thời gian thực, không bán vượt sức chứa." },
            { Icon: BadgeCheck, title: "Huỷ minh bạch", text: "Biết trước số tiền hoàn lại theo chính sách trước khi xác nhận huỷ." },
          ].map(({ Icon, title, text }) => (
            <li key={title} className="rounded-xl border border-line bg-white p-5">
              <Icon className="size-8 text-brand" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
