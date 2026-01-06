import React from 'react';
import { Customer, Product, Sale, ViewState } from '../types';
import NewSaleForm from './sales/NewSaleForm';
import SalesHistory from './sales/SalesHistory';

interface SalesProps {
    sales: Sale[];
    products: Product[];
    customers: Customer[];
    currentView: ViewState;
    changeView: (view: ViewState) => void;
}

const Sales: React.FC<SalesProps> = ({ sales, products, customers, currentView, changeView }) => {

    if (currentView === ViewState.NEW_SALE) {
        return (
            <NewSaleForm
                products={products}
                customers={customers}
                changeView={changeView}
                onSuccess={() => changeView(ViewState.SALES)}
            />
        );
    }

    return (
        <SalesHistory
            sales={sales}
            changeView={changeView}
        />
    );
};

export default Sales;