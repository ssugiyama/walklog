'use client'
import React, { Suspense } from 'react'
import { DataProvider } from '../../lib/utils/data-context'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import Main from './main'
import { UserContextProvider } from '../../lib/utils/user-context'
import { MainContextProvider } from '../../lib/utils/main-context'
import { ConfigProvider } from '../utils/config'
const Body = ({
  children,
}: {
  children: React.ReactNode
}) => {
  return (
    <AppRouterCacheProvider>
      <ConfigProvider>
        <UserContextProvider>
          <Suspense>
            <DataProvider>
              <MainContextProvider>
                <Main>
                  {children}
                </Main>
              </MainContextProvider>
            </DataProvider>
          </Suspense>
        </UserContextProvider>
      </ConfigProvider>
    </AppRouterCacheProvider>
  )
}

export default Body
