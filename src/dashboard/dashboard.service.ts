import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getGeneralStats(clinicId: string) {
    const ofTutor = { clinicId };
    const ofPet = { tutor: ofTutor };
    const ahora = new Date();

    const inicioHoy = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    );
    const haceUnaSemana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const haceUnMes = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalTutores = await this.prisma.tutor.count({ where: ofTutor });
    const totalMascotas = await this.prisma.pet.count({ where: ofPet });

    const [
      tutoresHoy,
      mascotasHoy,
      tutoresSemana,
      mascotasSemana,
      tutoresMes,
      mascotasMes,
    ] = await Promise.all([
      this.prisma.tutor.count({
        where: { ...ofTutor, createdAt: { gte: inicioHoy } },
      }),
      this.prisma.pet.count({
        where: { ...ofPet, createdAt: { gte: inicioHoy } },
      }),
      this.prisma.tutor.count({
        where: { ...ofTutor, createdAt: { gte: haceUnaSemana } },
      }),
      this.prisma.pet.count({
        where: { ...ofPet, createdAt: { gte: haceUnaSemana } },
      }),
      this.prisma.tutor.count({
        where: { ...ofTutor, createdAt: { gte: haceUnMes } },
      }),
      this.prisma.pet.count({
        where: { ...ofPet, createdAt: { gte: haceUnMes } },
      }),
    ]);

    const atencionesPorMotivo = await this.prisma.medicalEvent.groupBy({
      by: ['reason'],
      where: { pet: ofPet, date: { gte: haceUnMes } },
      _count: { _all: true },
    });

    const graficoAtencionesMes = atencionesPorMotivo.map((item) => ({
      motivo: item.reason,
      cantidad: item._count._all,
    }));

    const atencionesMascotasMes = await this.prisma.medicalEvent.findMany({
      where: { pet: ofPet, date: { gte: haceUnMes } },
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

    let motivoMasAtendidoMes = 'Ninguno';
    let maxMotivos = 0;
    graficoAtencionesMes.forEach((item) => {
      if (item.cantidad > maxMotivos) {
        maxMotivos = item.cantidad;
        motivoMasAtendidoMes = item.motivo;
      }
    });

    return {
      kpisGenerales: {
        totalTutores,
        totalMascotas,
        animalMasAtendidoMes,
        motivoMasAtendidoMes,
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
