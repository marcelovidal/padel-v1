import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Attribute {
    attribute: string;
    label: string;
    value: number;
    count: number;
}

export function PlayerAttributesChart({ data }: { data: Attribute[] }) {
    if (data.length === 0 || data.every(d => d.count === 0)) {
        return (
            <div className="text-center p-6 text-gray-500 italic border rounded-lg bg-gray-50">
                No hay suficientes datos de evaluaciones para mostrar el gráfico.
                ¡Completá tus evaluaciones pendientes!
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Promedios por Golpe (1-10)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.map((item) => (
                        <div key={item.attribute} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium capitalize">{item.label}</span>
                                <span className="text-gray-600 font-bold">{item.value > 0 ? item.value : '-'}</span>
                            </div>
                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                    style={{ width: `${(item.value / 10) * 100}%` }}
                                />
                            </div>
                            <div className="text-xs text-right text-gray-400">
                                {item.count} evals
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
