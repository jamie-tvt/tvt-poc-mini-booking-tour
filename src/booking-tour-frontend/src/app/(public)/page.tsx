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

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [toursRes, catsRes] = await Promise.allSettled([
    tourServer.search({ sort: "nextDeparture" }, 6),
    tourServer.categories(),
  ]);
  const categories = catsRes.status === "fulfilled" ? catsRes.value : [];

  return (
    <>
      <section className="aurora relative overflow-hidden text-white">
        <Container className="relative py-16 sm:py-20 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-100">Miền Tây sông nước · Biển đảo phương Nam</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Đi chợ nổi lúc bình minh, ngắm hoàng hôn trên đảo ngọc
          </h1>
          <p className="mt-4 max-w-2xl text-base text-sky-50 sm:text-lg">
            Chọn tour, chọn đợt khởi hành, giữ chỗ ngay và thanh toán trong vài phút.
          </p>
          <div className="mt-8">
            <HeroSearch categories={categories} />
          </div>
        </Container>
      </section>

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
