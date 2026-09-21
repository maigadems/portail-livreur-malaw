import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

// Auth flow
import SplashScreen from '../screens/SplashScreen';
import InscriptionScreen from '../screens/InscriptionScreen';
import OTPScreen from '../screens/OTPScreen';
import ConnexionScreen from '../screens/ConnexionScreen';

// Onboarding
import OnboardingScreen from '../screens/OnboardingScreen';

// KYC flow
import ProfilInscriptionScreen from '../screens/ProfilInscriptionScreen';
import CreerPinScreen from '../screens/CreerPinScreen';
import SaisirPinScreen from '../screens/SaisirPinScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import AttenteScreen from '../screens/AttenteScreen';
import ApprobationReussieScreen from '../screens/ApprobationReussieScreen';
import RefusCandidatureScreen from '../screens/RefusCandidatureScreen';

// Dashboard
import DashboardEnLigneScreen from '../screens/DashboardEnLigneScreen';
import DashboardHorsLigneScreen from '../screens/DashboardHorsLigneScreen';
import PauseScreen from '../screens/PauseScreen';

// Course flow
import AlerteCourseScreen from '../screens/AlerteCourseScreen';
import CoursesDisponiblesScreen from '../screens/CoursesDisponiblesScreen';
import EnRoutePickupScreen from '../screens/EnRoutePickupScreen';
import PickupConfirmeScreen from '../screens/PickupConfirmeScreen';
import ProblemePickupScreen from '../screens/ProblemePickupScreen';
import EnRouteClientScreen from '../screens/EnRouteClientScreen';
import AttenteClientScreen from '../screens/AttenteClientScreen';
import CodeConfirmationLivraisonScreen from '../screens/CodeConfirmationLivraisonScreen';
import ClientIntrouvableScreen from '../screens/ClientIntrouvableScreen';
import ConfirmationLivraisonScreen from '../screens/ConfirmationLivraisonScreen';

// Modals
import ModalAnnulationCourseScreen from '../screens/ModalAnnulationCourseScreen';
import ModalDeconnexionScreen from '../screens/ModalDeconnexionScreen';

// Wallet & finances
import WalletScreen from '../screens/WalletScreen';
import RetraitScreen from '../screens/RetraitScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import RecuCourseScreen from '../screens/RecuCourseScreen';
import DetailsHebdosScreen from '../screens/DetailsHebdosScreen';

// Profil & compte
import ProfilScreen from '../screens/ProfilScreen';
import ModifierProfilScreen from '../screens/ModifierProfilScreen';
import StatutDocumentsScreen from '../screens/StatutDocumentsScreen';
import ParametresScreen from '../screens/ParametresScreen';
import EvaluationsScreen from '../screens/EvaluationsScreen';

// Historique & support
import HistoriqueScreen from '../screens/HistoriqueScreen';
import DetailLivraisonScreen from '../screens/DetailLivraisonScreen';
import AideScreen from '../screens/AideScreen';
import LitigeScreen from '../screens/LitigeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

export type RootStackParamList = {
  // Auth
  Splash: undefined;
  Inscription: undefined;
  OTP: { phone: string; isNewUser?: boolean; devOtp?: string } | undefined;
  Connexion: undefined;
  // Onboarding
  Onboarding: undefined;
  // KYC — les données d'inscription circulent en params jusqu'à
  // register-courier (appelé à la fin de CreerPin).
  ProfilInscription: { phone: string; otp: string };
  CreerPin: {
    phone: string;
    otp: string;
    name: string;
    vehicleType: string;
    vehicleBrand?: string;
    vehicleColor?: string;
    vehiclePlate?: string;
    avatarUrl?: string;
  };
  SaisirPin: { phone: string };
  Documents: undefined;
  Attente: undefined;
  ApprobationReussie: undefined;
  // `reason` : motif rédigé par l'admin, transmis par l'écran d'attente au
  // moment de la bascule. L'écran le recharge aussi depuis l'API.
  RefusCandidature: { reason?: string } | undefined;
  // Dashboard
  DashboardEnLigne: undefined;
  DashboardHorsLigne: undefined;
  CoursesDisponibles: undefined;
  Pause: undefined;
  // Course flow — deliveryId/orderId circulent via les params une fois la
  // course acceptée (POST /deliveries/:id/assign).
  AlerteCourse: { deliveryId: string; orderId: string; earnings: number; distanceKm?: number } | undefined;
  EnRoutePickup: { deliveryId: string; orderId: string };
  PickupConfirme: { deliveryId: string; orderId: string };
  ProblemePickup: undefined;
  EnRouteClient: { deliveryId: string; orderId: string };
  AttenteClient: { deliveryId: string; orderId: string };
  CodeConfirmationLivraison: { orderId: string };
  ClientIntrouvable: undefined;
  ConfirmationLivraison: undefined;
  // Modals
  ModalAnnulationCourse: undefined;
  ModalDeconnexion: undefined;
  // Wallet
  Wallet: undefined;
  Retrait: undefined;
  Transactions: undefined;
  RecuCourse: undefined;
  DetailsHebdos: undefined;
  // Profil
  Profil: undefined;
  ModifierProfil: undefined;
  StatutDocuments: undefined;
  Parametres: undefined;
  Evaluations: undefined;
  // Support
  Historique: undefined;
  DetailLivraison: { deliveryId: string };
  Aide: undefined;
  // Litige : `orderId` cible directement la course concernée (depuis le
  // détail d'une livraison). Sans paramètre, l'écran fait choisir la course
  // parmi les dernières du livreur.
  Litige: { orderId?: string; restaurantName?: string } | undefined;
  Notifications: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Exposée pour SessionExpiredModal (monté hors de la pile) : redirige vers
// Connexion sans prop navigation local.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const fadeTransition = {
  cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
  transitionSpec: {
    open:  { animation: 'timing' as const, config: { duration: 180 } },
    close: { animation: 'timing' as const, config: { duration: 150 } },
  },
};

export default function Navigation() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, gestureEnabled: false } as any}
      >
        {/* Auth */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Inscription" component={InscriptionScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="Connexion" component={ConnexionScreen} />

        {/* Onboarding */}
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />

        {/* KYC */}
        <Stack.Screen name="ProfilInscription" component={ProfilInscriptionScreen} />
        <Stack.Screen name="CreerPin" component={CreerPinScreen} />
        <Stack.Screen name="SaisirPin" component={SaisirPinScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="Attente" component={AttenteScreen} />
        <Stack.Screen name="ApprobationReussie" component={ApprobationReussieScreen} />
        <Stack.Screen name="RefusCandidature" component={RefusCandidatureScreen} />

        {/* Dashboard — fade pour les transitions navbar */}
        <Stack.Screen name="DashboardEnLigne" component={DashboardEnLigneScreen} options={fadeTransition as any} />
        <Stack.Screen name="DashboardHorsLigne" component={DashboardHorsLigneScreen} options={fadeTransition as any} />
        <Stack.Screen name="CoursesDisponibles" component={CoursesDisponiblesScreen} />
        <Stack.Screen name="Pause" component={PauseScreen} />

        {/* Course flow */}
        <Stack.Screen name="AlerteCourse" component={AlerteCourseScreen} />
        <Stack.Screen name="EnRoutePickup" component={EnRoutePickupScreen} />
        <Stack.Screen name="PickupConfirme" component={PickupConfirmeScreen} />
        <Stack.Screen name="ProblemePickup" component={ProblemePickupScreen} />
        <Stack.Screen name="EnRouteClient" component={EnRouteClientScreen} />
        <Stack.Screen name="AttenteClient" component={AttenteClientScreen} />
        <Stack.Screen name="CodeConfirmationLivraison" component={CodeConfirmationLivraisonScreen} />
        <Stack.Screen name="ClientIntrouvable" component={ClientIntrouvableScreen} />
        <Stack.Screen name="ConfirmationLivraison" component={ConfirmationLivraisonScreen} />

        {/* Modals - presented as overlays */}
        <Stack.Screen
          name="ModalAnnulationCourse"
          component={ModalAnnulationCourseScreen}
          options={{ presentation: 'transparentModal', gestureEnabled: true } as any}
        />
        <Stack.Screen
          name="ModalDeconnexion"
          component={ModalDeconnexionScreen}
          options={{ presentation: 'transparentModal', gestureEnabled: true } as any}
        />

        {/* Wallet & finances — fade pour les transitions navbar */}
        <Stack.Screen name="Wallet" component={WalletScreen} options={fadeTransition as any} />
        <Stack.Screen name="Retrait" component={RetraitScreen} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} />
        <Stack.Screen name="RecuCourse" component={RecuCourseScreen} />
        <Stack.Screen name="DetailsHebdos" component={DetailsHebdosScreen} />

        {/* Profil — fade pour les transitions navbar */}
        <Stack.Screen name="Profil" component={ProfilScreen} options={fadeTransition as any} />
        <Stack.Screen name="ModifierProfil" component={ModifierProfilScreen} />
        <Stack.Screen name="StatutDocuments" component={StatutDocumentsScreen} />
        <Stack.Screen name="Parametres" component={ParametresScreen} />
        <Stack.Screen name="Evaluations" component={EvaluationsScreen} />

        {/* Support & historique — fade pour les transitions navbar */}
        <Stack.Screen name="Historique" component={HistoriqueScreen} options={fadeTransition as any} />
        <Stack.Screen name="DetailLivraison" component={DetailLivraisonScreen} />
        <Stack.Screen name="Aide" component={AideScreen} />
        <Stack.Screen name="Litige" component={LitigeScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
