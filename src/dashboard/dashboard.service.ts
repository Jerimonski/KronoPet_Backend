import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getGeneralStats() {
    const ahora = new Date();

    const inicioHoy = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    );
    const haceUnaSemana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const haceUnMes = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalTutores = await this.prisma.user.count();
    const totalMascotas = await this.prisma.pet.count();

    const [
      tutoresHoy,
      mascotasHoy,
      tutoresSemana,
      mascotasSemana,
      tutoresMes,
      mascotasMes,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: inicioHoy } } }),
      this.prisma.pet.count({ where: { createdAt: { gte: inicioHoy } } }),
      this.prisma.user.count({ where: { createdAt: { gte: haceUnaSemana } } }),
      this.prisma.pet.count({ where: { createdAt: { gte: haceUnaSemana } } }),
      this.prisma.user.count({ where: { createdAt: { gte: haceUnMes } } }),
      this.prisma.pet.count({ where: { createdAt: { gte: haceUnMes } } }),
    ]);

    const atencionesPorCategoria = await this.prisma.medicalEvent.groupBy({
      by: ['category'],
      where: { date: { gte: haceUnMes } },
      _count: { _all: true },
    });

    const graficoAtencionesMes = atencionesPorCategoria.map((item) => ({
      categoria: item.category,
      cantidad: item._count._all,
    }));

    const atencionesMascotasMes = await this.prisma.medicalEvent.findMany({
      where: { date: { gte: haceUnMes } },
      select: { pet: { select: { species: true } } },
    });

    const conteoEspecies: Record<string, number> = {};
    atencionesMascotasMes.forEach((ev) => {
      const especie = ev.pet.species;
      conteoEspecies[especie] = (conteoEspecies[especie] || 0) + 1;
    });

    let animalMasAtendidoMes = 'Ninguno';
    let maxAnimales = 0;
    for (const [especie, cantidad] of Object.entries(conteoEspecies)) {
      if (cantidad > maxAnimales) {
        maxAnimales = cantidad;
        animalMasAtendidoMes = especie;
      }
    }

    let categoriaMasAtendidaMes = 'Ninguna';
    let maxCategorias = 0;
    graficoAtencionesMes.forEach((item) => {
      if (item.cantidad > maxCategorias) {
        maxCategorias = item.cantidad;
        categoriaMasAtendidaMes = item.categoria;
      }
    });

    return {
      kpisGenerales: {
        totalTutores,
        totalMascotas,
        animalMasAtendidoMes,
        categoriaMasAtendidaMes,
      },
      registrosPeriodo: {
        hoy: { tutores: tutoresHoy, mascotas: mascotasHoy },
        estaSemana: { tutores: tutoresSemana, mascotas: mascotasSemana },
        esteMes: { tutores: tutoresMes, mascotas: mascotasMes },
      },
      graficoAtencionesMes,
    };
  }
}
